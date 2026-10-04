import manifest from '__STATIC_CONTENT_MANIFEST';
import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { cors } from 'hono/cors';
import { generateUUID, computeChainHash, computeSnapshotHash, sha256 } from './hash.js';

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use('/api/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['Content-Disposition'],
    maxAge: 600,
}));

// ── SCHEMA MIGRATIONS (idempotent, runs once per worker instance) ─────────────
let schemaReady = false;
async function ensureSchema(db) {
    if (schemaReady) return;
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            election_id TEXT NOT NULL,
            action TEXT NOT NULL,
            ip_hash TEXT,
            created_at TEXT NOT NULL
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS rate_limits (
            ip_hash TEXT NOT NULL,
            action TEXT NOT NULL,
            window_start INTEGER NOT NULL,
            count INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (ip_hash, action, window_start)
        )`);
        // These silently fail if the column already exists — that's intentional.
        try { await db.exec(`ALTER TABLE elections ADD COLUMN description TEXT`); } catch (_) {}
        try { await db.exec(`ALTER TABLE elections ADD COLUMN created_by_ip TEXT`); } catch (_) {}
        schemaReady = true;
    } catch (e) {
        console.error('Schema migration error:', e);
    }
}

// ── RATE LIMITER ──────────────────────────────────────────────────────────────
// Returns null if OK, or an error string if rate limit exceeded.
async function checkRateLimit(db, ip, action, maxRequests, windowSeconds) {
    if (!ip) return null; // No IP = can't rate-limit; let it through
    try {
        const ip_hash = await sha256(ip);
        const now = Math.floor(Date.now() / 1000);
        const window_start = now - (now % windowSeconds);

        // Prune windows older than 2x the window size to keep table small
        await db.prepare(
            `DELETE FROM rate_limits WHERE ip_hash = ? AND action = ? AND window_start < ?`
        ).bind(ip_hash, action, window_start - windowSeconds).run();

        const row = await db.prepare(
            `SELECT count FROM rate_limits WHERE ip_hash = ? AND action = ? AND window_start = ?`
        ).bind(ip_hash, action, window_start).first();

        if (row) {
            if (row.count >= maxRequests) {
                return `Rate limit exceeded. Max ${maxRequests} requests per ${windowSeconds}s.`;
            }
            await db.prepare(
                `UPDATE rate_limits SET count = count + 1 WHERE ip_hash = ? AND action = ? AND window_start = ?`
            ).bind(ip_hash, action, window_start).run();
        } else {
            await db.prepare(
                `INSERT INTO rate_limits (ip_hash, action, window_start, count) VALUES (?, ?, ?, 1)`
            ).bind(ip_hash, action, window_start).run();
        }
        return null;
    } catch (e) {
        // If rate-limit table fails for any reason, don't block the request
        console.error('Rate limit check failed:', e);
        return null;
    }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function logAudit(db, election_id, action, ip) {
    try {
        const ip_hash = ip ? await sha256(ip) : null;
        await db.prepare(
            `INSERT INTO audit_logs (id, election_id, action, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)`
        ).bind(generateUUID(), election_id, action, ip_hash, new Date().toISOString()).run();
    } catch (_) {}
}

function getClientIP(c) {
    return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null;
}

// ── GET /api/stats ─────────────────────────────────────────────────────────────
app.get('/api/stats', async (c) => {
    try {
        const db = c.env.DB;
        await ensureSchema(db);
        const [total_elections, open_elections, total_ballots] = await Promise.all([
            db.prepare('SELECT COUNT(*) as c FROM elections').first(),
            db.prepare("SELECT COUNT(*) as c FROM elections WHERE status = 'open'").first(),
            db.prepare('SELECT COUNT(*) as c FROM ballots').first(),
        ]);
        return c.json({
            ok: true,
            total_elections: total_elections.c,
            open_elections: open_elections.c,
            total_ballots: total_ballots.c,
        });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/elections ─────────────────────────────────────────────────────────
app.get('/api/elections', async (c) => {
    try {
        const db = c.env.DB;
        await ensureSchema(db);
        const { results } = await db.prepare(`
            SELECT e.id, e.title, e.status, e.mode, e.created_at,
                   COUNT(b.ballot_id) as vote_count
            FROM elections e
            LEFT JOIN ballots b ON e.id = b.election_id
            GROUP BY e.id
            ORDER BY e.created_at DESC
        `).all();
        return c.json({ ok: true, elections: results });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/elections/:id ─────────────────────────────────────────────────────
app.get('/api/elections/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const db = c.env.DB;
        await ensureSchema(db);
        const election = await db.prepare('SELECT * FROM elections WHERE id = ?').bind(id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);
        const { results: candidates } = await db.prepare(
            'SELECT id, name, party, platform FROM candidates WHERE election_id = ?'
        ).bind(id).all();
        const ballot_count = (
            await db.prepare('SELECT COUNT(*) as c FROM ballots WHERE election_id = ?').bind(id).first()
        ).c;
        return c.json({ ok: true, election, candidates, ballot_count });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── POST /api/elections ────────────────────────────────────────────────────────
app.post('/api/elections', async (c) => {
    try {
        const db = c.env.DB;
        await ensureSchema(db);

        const rateLimitErr = await checkRateLimit(db, getClientIP(c), 'create_election', 3, 60);
        if (rateLimitErr) return c.json({ ok: false, error: rateLimitErr }, 429);

        const body = await c.req.json();
        const { title, description, candidates: cands, mode } = body;

        if (!title || typeof title !== 'string' || title.trim().length < 3) {
            return c.json({ ok: false, error: 'title must be at least 3 characters' }, 400);
        }
        if (!cands || !Array.isArray(cands) || cands.length < 2) {
            return c.json({ ok: false, error: 'at least 2 candidates required' }, 400);
        }
        for (const cand of cands) {
            if (!cand.name || typeof cand.name !== 'string') {
                return c.json({ ok: false, error: 'each candidate must have a name' }, 400);
            }
        }

        const id = generateUUID();
        const ip = getClientIP(c);
        const ip_hash = ip ? await sha256(ip) : null;
        const created_at = new Date().toISOString();
        const electionMode = (mode === 'demo' || mode === 'safe') ? mode : 'safe';

        const stmts = [
            db.prepare(`
                INSERT INTO elections (id, title, status, mode, chain_head, created_at, description, created_by_ip)
                VALUES (?, ?, 'open', ?, 'GENESIS', ?, ?, ?)
            `).bind(id, title.trim(), electionMode, created_at, description?.trim() || null, ip_hash),
        ];

        for (const cand of cands) {
            const candId = cand.id && /^[A-Za-z0-9_-]+$/.test(cand.id) ? cand.id : generateUUID();
            stmts.push(db.prepare(`
                INSERT INTO candidates (id, election_id, name, party, platform)
                VALUES (?, ?, ?, ?, ?)
            `).bind(candId, id, cand.name.trim(), cand.party?.trim() || cand.name.trim(), cand.platform?.trim() || null));
        }

        await db.batch(stmts);
        await logAudit(db, id, 'election_created', ip);

        return c.json({
            ok: true,
            election_id: id,
            url: `/e/${id}`,
            title: title.trim(),
            mode: electionMode,
            created_at,
        }, 201);
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/board ─────────────────────────────────────────────────────────────
app.get('/api/board', async (c) => {
    try {
        const election_id = c.req.query('election_id');
        if (!election_id) return c.json({ ok: false, error: 'Missing election_id' }, 400);

        const db = c.env.DB;
        await ensureSchema(db);

        const election = await db.prepare('SELECT * FROM elections WHERE id = ?').bind(election_id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);

        const { results: candidates } = await db.prepare(
            'SELECT id, name, party, platform, avatar_url FROM candidates WHERE election_id = ?'
        ).bind(election_id).all();

        const { results: ballots } = await db.prepare(
            'SELECT ballot_id, `index`, cast_at, commit_hash as `commit`, receipt_hash, prev_hash, chain_hash FROM ballots WHERE election_id = ? ORDER BY `index` ASC'
        ).bind(election_id).all();

        return c.json({
            ok: true,
            ballots,
            candidates,
            election: {
                id: election.id,
                title: election.title,
                status: election.status,
                chain_head: election.chain_head,
                snapshot_hash: election.snapshot_hash || null,
                closed_at: election.closed_at || null,
                mode: election.mode,
            },
        });
    } catch (e) {
        console.error(e);
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── POST /api/cast ─────────────────────────────────────────────────────────────
app.post('/api/cast', async (c) => {
    try {
        const body = await c.req.json();
        const { election_id, commit, receipt_hash, mode, choice, nonce,
                voter_age_group, voter_state, voter_gender, voter_party } = body;

        if (!election_id || !commit || !receipt_hash) {
            return c.json({ ok: false, error: 'Missing required fields: election_id, commit, receipt_hash' }, 400);
        }

        const db = c.env.DB;
        await ensureSchema(db);

        const rateLimitErr = await checkRateLimit(db, getClientIP(c), 'cast_ballot', 10, 60);
        if (rateLimitErr) return c.json({ ok: false, error: rateLimitErr }, 429);

        const election = await db.prepare(
            'SELECT status, chain_head, mode FROM elections WHERE id = ?'
        ).bind(election_id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);
        if (election.status !== 'open') return c.json({ ok: false, error: 'Election is closed' }, 400);

        const duplicate = await db.prepare(
            'SELECT ballot_id FROM ballots WHERE receipt_hash = ?'
        ).bind(receipt_hash).first();
        if (duplicate) return c.json({ ok: false, error: 'Duplicate receipt_hash' }, 400);

        const current_count = (
            await db.prepare('SELECT COUNT(*) as c FROM ballots WHERE election_id = ?').bind(election_id).first()
        ).c;

        const prev_hash = election.chain_head;
        const index = current_count + 1;
        const cast_at = new Date().toISOString();
        const chain_hash = await computeChainHash(prev_hash, election_id, index, commit, cast_at);
        const ballot_id = generateUUID();

        const stmts = [
            db.prepare(`
                INSERT INTO ballots (ballot_id, election_id, \`index\`, cast_at, commit_hash, receipt_hash, prev_hash, chain_hash, mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(ballot_id, election_id, index, cast_at, commit, receipt_hash, prev_hash, chain_hash, mode || 'safe'),
            // Optimistic lock: only update if chain_head hasn't changed since we read it
            db.prepare(`
                UPDATE elections SET chain_head = ? WHERE id = ? AND chain_head = ?
            `).bind(chain_hash, election_id, prev_hash),
        ];

        if (election.mode === 'demo' && choice && nonce) {
            stmts.push(db.prepare(`
                INSERT INTO reveals (ballot_id, election_id, choice, nonce, voter_age_group, voter_state, voter_party, voter_gender)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(ballot_id, election_id, choice, nonce,
                voter_age_group || null, voter_state || null, voter_party || null, voter_gender || null));
        }

        const results = await db.batch(stmts);

        if (results[1].meta.changes === 0) {
            return c.json({ ok: false, error: 'Concurrency conflict — please try again.' }, 409);
        }

        await logAudit(db, election_id, 'ballot_cast', getClientIP(c));

        return c.json({ ok: true, index, chain_hash, cast_at, head: chain_hash });
    } catch (e) {
        console.error(e);
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/receipt ───────────────────────────────────────────────────────────
app.get('/api/receipt', async (c) => {
    try {
        const election_id = c.req.query('election_id');
        const receipt_hash = c.req.query('receipt_hash');
        if (!election_id || !receipt_hash) {
            return c.json({ ok: false, error: 'Missing election_id or receipt_hash' }, 400);
        }

        const ballot = await c.env.DB.prepare(`
            SELECT b.ballot_id, b.\`index\`, b.cast_at, b.commit_hash as \`commit\`, b.receipt_hash,
                   b.prev_hash, b.chain_hash,
                   r.voter_age_group, r.voter_state, r.voter_gender, r.voter_party, r.choice
            FROM ballots b
            LEFT JOIN reveals r ON b.ballot_id = r.ballot_id
            WHERE b.election_id = ? AND b.receipt_hash = ?
        `).bind(election_id, receipt_hash).first();

        if (!ballot) return c.json({ ok: true, found: false, ballot: null });
        return c.json({ ok: true, found: true, ballot });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/verify ────────────────────────────────────────────────────────────
app.get('/api/verify', async (c) => {
    try {
        const election_id = c.req.query('election_id');
        const receipt_hash = c.req.query('receipt_hash');
        if (!election_id) return c.json({ ok: false, error: 'Missing election_id' }, 400);

        const db = c.env.DB;
        const election = await db.prepare('SELECT chain_head FROM elections WHERE id = ?').bind(election_id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);

        const { results: ballots } = await db.prepare(
            'SELECT * FROM ballots WHERE election_id = ? ORDER BY `index` ASC'
        ).bind(election_id).all();

        const errors = [];
        let computedHead = 'GENESIS';
        let chainValid = true;
        let receiptFound = false;
        let receiptIndex = null;

        for (let i = 0; i < ballots.length; i++) {
            const ballot = ballots[i];
            const expectedIndex = i + 1;

            if (ballot.index !== expectedIndex) {
                errors.push(`Ballot at position ${i}: expected index ${expectedIndex}, got ${ballot.index}`);
                chainValid = false;
            }
            if (ballot.prev_hash !== computedHead) {
                errors.push(`Ballot ${ballot.index}: prev_hash mismatch`);
                chainValid = false;
            }

            const expectedChainHash = await computeChainHash(
                ballot.prev_hash, election_id, ballot.index, ballot.commit_hash, ballot.cast_at
            );
            if (ballot.chain_hash !== expectedChainHash) {
                errors.push(`Ballot ${ballot.index}: chain_hash mismatch`);
                chainValid = false;
            }

            computedHead = ballot.chain_hash;

            if (receipt_hash && ballot.receipt_hash === receipt_hash) {
                receiptFound = true;
                receiptIndex = ballot.index;
            }
        }

        const headMatches = computedHead === election.chain_head;
        if (!headMatches) { errors.push('Final head mismatch'); chainValid = false; }

        return c.json({
            ok: true,
            chain_valid: chainValid,
            computed_head: computedHead,
            expected_head: election.chain_head,
            head_matches: headMatches,
            ballot_count: ballots.length,
            receipt_found: receiptFound,
            receipt_index: receiptIndex,
            errors,
        });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── POST /api/close ────────────────────────────────────────────────────────────
app.post('/api/close', async (c) => {
    try {
        const body = await c.req.json();
        const election_id = body.election_id;
        if (!election_id) return c.json({ ok: false, error: 'Missing election_id' }, 400);

        const db = c.env.DB;
        const election = await db.prepare('SELECT * FROM elections WHERE id = ?').bind(election_id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);
        if (election.status === 'closed') return c.json({ ok: false, error: 'Already closed' }, 400);

        const count = (
            await db.prepare('SELECT COUNT(*) as c FROM ballots WHERE election_id = ?').bind(election_id).first()
        ).c;
        const closed_at = new Date().toISOString();
        const snapshot_hash = await computeSnapshotHash(election.chain_head, count, closed_at);

        await db.prepare(
            'UPDATE elections SET status = ?, closed_at = ?, snapshot_hash = ? WHERE id = ?'
        ).bind('closed', closed_at, snapshot_hash, election_id).run();

        await logAudit(db, election_id, 'election_closed', getClientIP(c));

        return c.json({ ok: true, closed_at, snapshot_hash });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/tally ─────────────────────────────────────────────────────────────
app.get('/api/tally', async (c) => {
    try {
        const election_id = c.req.query('election_id');
        const db = c.env.DB;
        const election = await db.prepare('SELECT * FROM elections WHERE id = ?').bind(election_id).first();

        if (!election || election.status !== 'closed' || election.mode !== 'demo') {
            return c.json({ ok: false, error: 'Tally unavailable — election must be closed and in demo mode' }, 400);
        }

        const { results: candidates } = await db.prepare(
            'SELECT id, name FROM candidates WHERE election_id = ?'
        ).bind(election_id).all();

        const { results: reveals } = await db.prepare(`
            SELECT r.ballot_id, r.choice, r.voter_age_group, r.voter_state, r.voter_gender, r.voter_party,
                   b.commit_hash, r.nonce
            FROM reveals r
            JOIN ballots b ON r.ballot_id = b.ballot_id
            WHERE r.election_id = ?
        `).bind(election_id).all();

        const tally = {};
        const stateTally = {};
        const ageTally = {};
        const genderTally = {};
        const partyTally = {};

        for (const cand of candidates) tally[cand.id] = 0;

        for (const row of reveals) {
            const expectedCommit = await sha256(`${election_id}|${row.choice}|${row.nonce}`);
            if (expectedCommit !== row.commit_hash) continue; // Skip tampered reveals

            tally[row.choice] = (tally[row.choice] || 0) + 1;

            if (row.voter_state) {
                if (!stateTally[row.voter_state]) stateTally[row.voter_state] = {};
                stateTally[row.voter_state][row.choice] = (stateTally[row.voter_state][row.choice] || 0) + 1;
            }
            if (row.voter_age_group) {
                if (!ageTally[row.voter_age_group]) ageTally[row.voter_age_group] = {};
                ageTally[row.voter_age_group][row.choice] = (ageTally[row.voter_age_group][row.choice] || 0) + 1;
            }
            if (row.voter_gender) {
                if (!genderTally[row.voter_gender]) genderTally[row.voter_gender] = {};
                genderTally[row.voter_gender][row.choice] = (genderTally[row.voter_gender][row.choice] || 0) + 1;
            }
            if (row.voter_party) {
                if (!partyTally[row.voter_party]) partyTally[row.voter_party] = {};
                partyTally[row.voter_party][row.choice] = (partyTally[row.voter_party][row.choice] || 0) + 1;
            }
        }

        return c.json({
            ok: true,
            found: true,
            tally_proof: {
                election_id,
                election_title: election.title,
                closed_at: election.closed_at,
                snapshot_hash: election.snapshot_hash,
                tally,
                candidates: candidates.map(c => ({ id: c.id, name: c.name })),
                state_breakdown: stateTally,
                age_breakdown: ageTally,
                gender_breakdown: genderTally,
                party_breakdown: partyTally,
                total_revealed: reveals.length,
            },
        });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── POST /api/reset ────────────────────────────────────────────────────────────
app.post('/api/reset', async (c) => {
    try {
        const body = await c.req.json();
        const election_id = body.election_id;
        if (!election_id) return c.json({ ok: false, error: 'Missing election_id' }, 400);

        const db = c.env.DB;
        await db.batch([
            db.prepare('DELETE FROM reveals WHERE election_id = ?').bind(election_id),
            db.prepare('DELETE FROM ballots WHERE election_id = ?').bind(election_id),
            db.prepare(
                'UPDATE elections SET status = "open", chain_head = "GENESIS", closed_at = NULL, snapshot_hash = NULL WHERE id = ?'
            ).bind(election_id),
        ]);

        await logAudit(db, election_id, 'election_reset', getClientIP(c));

        return c.json({ ok: true });
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/chain/export ──────────────────────────────────────────────────────
app.get('/api/chain/export', async (c) => {
    try {
        const election_id = c.req.query('election_id');
        if (!election_id) return c.json({ ok: false, error: 'Missing election_id' }, 400);

        const db = c.env.DB;
        const election = await db.prepare('SELECT * FROM elections WHERE id = ?').bind(election_id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);

        const { results: ballots } = await db.prepare(
            'SELECT * FROM ballots WHERE election_id = ? ORDER BY `index` ASC'
        ).bind(election_id).all();
        const { results: candidates } = await db.prepare(
            'SELECT id, name, party FROM candidates WHERE election_id = ?'
        ).bind(election_id).all();

        const export_data = {
            export_version: '1.0',
            exported_at: new Date().toISOString(),
            election: {
                id: election.id,
                title: election.title,
                status: election.status,
                mode: election.mode,
                chain_head: election.chain_head,
                snapshot_hash: election.snapshot_hash || null,
                closed_at: election.closed_at || null,
            },
            candidates,
            ballot_count: ballots.length,
            chain: ballots.map(b => ({
                index: b.index,
                ballot_id: b.ballot_id,
                cast_at: b.cast_at,
                commit_hash: b.commit_hash,
                receipt_hash: b.receipt_hash,
                prev_hash: b.prev_hash,
                chain_hash: b.chain_hash,
            })),
        };

        const shortId = election_id.substring(0, 8);
        c.header('Content-Type', 'application/json');
        c.header('Content-Disposition', `attachment; filename="election-${shortId}-chain.json"`);
        return c.text(JSON.stringify(export_data, null, 2));
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── GET /api/audit/proof ───────────────────────────────────────────────────────
app.get('/api/audit/proof', async (c) => {
    try {
        const election_id = c.req.query('election_id');
        if (!election_id) return c.json({ ok: false, error: 'Missing election_id' }, 400);

        const db = c.env.DB;
        const election = await db.prepare('SELECT * FROM elections WHERE id = ?').bind(election_id).first();
        if (!election) return c.json({ ok: false, error: 'Election not found' }, 404);

        const { results: ballots } = await db.prepare(
            'SELECT * FROM ballots WHERE election_id = ? ORDER BY `index` ASC'
        ).bind(election_id).all();

        const blocks = [];
        const errors = [];
        let computedHead = 'GENESIS';
        let chainValid = true;

        for (let i = 0; i < ballots.length; i++) {
            const b = ballots[i];
            const expectedIndex = i + 1;
            const blockErrors = [];

            if (b.index !== expectedIndex) {
                blockErrors.push(`index_mismatch: expected ${expectedIndex}, got ${b.index}`);
                chainValid = false;
            }
            if (b.prev_hash !== computedHead) {
                blockErrors.push('prev_hash_mismatch');
                chainValid = false;
            }

            const expectedHash = await computeChainHash(
                b.prev_hash, election_id, b.index, b.commit_hash, b.cast_at
            );
            const hashValid = b.chain_hash === expectedHash;
            if (!hashValid) { blockErrors.push('chain_hash_mismatch'); chainValid = false; }

            computedHead = b.chain_hash;
            errors.push(...blockErrors);

            blocks.push({
                index: b.index,
                ballot_id: b.ballot_id,
                cast_at: b.cast_at,
                prev_hash: b.prev_hash,
                chain_hash: b.chain_hash,
                computed_hash: expectedHash,
                hash_valid: hashValid,
                errors: blockErrors,
            });
        }

        const head_matches = computedHead === election.chain_head;
        if (!head_matches && ballots.length > 0) {
            chainValid = false;
            errors.push('final_head_mismatch');
        }

        const proof = {
            proof_version: '1.0',
            generated_at: new Date().toISOString(),
            election_id,
            election_title: election.title,
            chain_valid: chainValid,
            ballot_count: ballots.length,
            computed_head: computedHead,
            stored_head: election.chain_head,
            head_matches,
            snapshot_hash: election.snapshot_hash || null,
            error_count: errors.length,
            errors,
            blocks,
        };

        const shortId = election_id.substring(0, 8);
        c.header('Content-Type', 'application/json');
        c.header('Content-Disposition', `attachment; filename="election-${shortId}.proof.json"`);
        return c.text(JSON.stringify(proof, null, 2));
    } catch (e) {
        return c.json({ ok: false, error: e.message }, 500);
    }
});

// ── SPA ROUTING ───────────────────────────────────────────────────────────────
// Serve index.html for all /e/:id paths so the frontend can handle routing
app.get('/e/:id', serveStatic({ path: 'index.html', manifest }));
app.get('/e/:id/audit', serveStatic({ path: 'audit.html', manifest }));
app.get('/elections', serveStatic({ path: 'elections.html', manifest }));

// Static file serving
app.get('/', serveStatic({ path: 'index.html', manifest }));
app.get('/*', serveStatic({ root: './', manifest }));

app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));

export default app;
