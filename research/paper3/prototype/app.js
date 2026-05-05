/**
 * Glass Ballot Box — Main Client Application
 * Vanilla JS, no framework, SubtleCrypto for all cryptographic operations.
 */

const DEFAULT_ELECTION_ID = 'e0000000-0000-0000-0000-000000000001';
const DEFAULT_CANDIDATES = Object.freeze([
    {
        id: 'CAND-A',
        name: 'Progressive India Alliance',
        party: 'Progressive India Alliance',
        platform: 'Universal Digital Infrastructure, Green Energy Expansion, Education Reform.'
    },
    {
        id: 'CAND-B',
        name: 'National Democratic Front',
        party: 'National Democratic Front',
        platform: 'Economic Deregulation, Strong Border Security, Manufacturing Hub.'
    },
    {
        id: 'CAND-C',
        name: 'Independent Voice',
        party: 'Independent Voice',
        platform: 'Local Governance, Agricultural Subsidies, Healthcare Access.'
    },
]);

function cloneCandidateSlate(candidates = DEFAULT_CANDIDATES) {
    return candidates.map((candidate) => ({ ...candidate }));
}

function normalizeCandidateSlate(candidates) {
    if (!Array.isArray(candidates)) return cloneCandidateSlate();

    const normalized = candidates
        .filter((candidate) => candidate && typeof candidate.name === 'string')
        .map((candidate, index) => {
            const fallback = DEFAULT_CANDIDATES[index] || {};
            const name = candidate.name.trim() || fallback.name || `Candidate ${index + 1}`;
            return {
                id: candidate.id || fallback.id || `CAND-${index + 1}`,
                name,
                party: candidate.party?.trim() || fallback.party || name,
                platform: candidate.platform?.trim() || fallback.platform || '',
            };
        });

    return normalized.length >= 2 ? normalized : cloneCandidateSlate();
}

function buildPrototypePageUrl(page, electionId = null, extraParams = {}) {
    const marker = '/research/paper3/prototype/';
    const scopedBase = window.location.pathname.includes(marker)
        ? `${window.location.origin}${marker}${page}`
        : `${window.location.origin}/${page}`;
    const url = new URL(scopedBase);
    if (electionId) url.searchParams.set('election_id', electionId);
    Object.entries(extraParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    return url.toString();
}

// ── STATE ──────────────────────────────────────────────────────────────────────
const state = {
    electionId: DEFAULT_ELECTION_ID,
    election: null,
    ballots: [],
    candidates: cloneCandidateSlate(),
    selectedCandidate: null,
    mode: 'safe',
    lastReceipt: null,
    verifiedBallots: new Set(),
    pollingInterval: null,
    pollingRate: 1500,
};

// ── DOM HELPERS ────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── TOAST SYSTEM ───────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
    let container = $('#toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

// ── CONFIRM MODAL ──────────────────────────────────────────────────────────────
function showConfirm(message, sub, onConfirm) {
    const modal = $('#confirm-modal');
    if (!modal) { if (window.confirm(message)) onConfirm(); return; }
    $('#confirm-message').textContent = message;
    $('#confirm-sub').textContent = sub || 'This action cannot be undone.';
    modal.classList.add('show');

    const cleanup = () => modal.classList.remove('show');

    const okBtn = $('#confirm-ok');
    const cancelBtn = $('#confirm-cancel');

    const handleOk = () => { cleanup(); onConfirm(); okBtn.removeEventListener('click', handleOk); cancelBtn.removeEventListener('click', handleCancel); };
    const handleCancel = () => { cleanup(); okBtn.removeEventListener('click', handleOk); cancelBtn.removeEventListener('click', handleCancel); };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}

// ── MOCK SERVER (fallback when real API is unreachable) ────────────────────────
const MockServer = {
    DELAY: 250,
    db: {
        election: {
            id: DEFAULT_ELECTION_ID,
            title: 'Glass Ballot Box Demo (India National Mock Election)',
            status: 'open',
            chain_head: 'GENESIS',
            snapshot_hash: null,
            closed_at: null,
            mode: 'demo',
        },
        candidates: cloneCandidateSlate(),
        ballots: [],
    },

    init() {
        try {
            const stored = localStorage.getItem('glass_ballot_mock_db');
            if (stored) {
                this.db = JSON.parse(stored);
                // Always ensure the election ID matches the real demo election
                this.db.election.id = DEFAULT_ELECTION_ID;
            }
        } catch (e) { console.error('Mock DB init failed', e); }
        this.db.candidates = normalizeCandidateSlate(this.db.candidates);
        this.db.ballots = Array.isArray(this.db.ballots) ? this.db.ballots : [];
    },

    save() {
        try { localStorage.setItem('glass_ballot_mock_db', JSON.stringify(this.db)); } catch (_) {}
    },

    async handle(url, method, body) {
        await new Promise(r => setTimeout(r, this.DELAY));

        if (url.includes('/api/board') && method === 'GET') {
            return { ok: true, election: this.db.election, candidates: this.db.candidates, ballots: this.db.ballots };
        }

        if (url.includes('/api/cast') && method === 'POST') {
            const payload = typeof body === 'string' ? JSON.parse(body) : body;
            if (this.db.election.status !== 'open') return { ok: false, error: 'Election is closed' };

            const index = this.db.ballots.length + 1;
            const prevHash = this.db.ballots.length > 0
                ? this.db.ballots[this.db.ballots.length - 1].chain_hash
                : this.db.election.chain_head;
            const castAt = new Date().toISOString();
            const chainHash = await Crypto.computeChainHash(prevHash, this.db.election.id, index, payload.commit, castAt);

            const ballot = {
                index, cast_at: castAt,
                commit: payload.commit,
                receipt_hash: payload.receipt_hash,
                prev_hash: prevHash,
                chain_hash: chainHash,
                choice: payload.choice || null,
                nonce: payload.nonce || null,
            };
            this.db.ballots.push(ballot);
            this.db.election.chain_head = chainHash;
            this.save();
            return { ok: true, index, chain_hash: chainHash, cast_at: castAt, head: chainHash };
        }

        if (url.includes('/api/receipt') && method === 'GET') {
            const params = new URLSearchParams(url.split('?')[1] || '');
            const receiptHash = params.get('receipt_hash');
            const ballot = this.db.ballots.find(b => b.receipt_hash === receiptHash);
            return { ok: true, found: !!ballot, ballot: ballot || null };
        }

        if (url.includes('/api/close') && method === 'POST') {
            this.db.election.status = 'closed';
            this.db.election.closed_at = new Date().toISOString();
            this.save();
            return { ok: true, closed_at: this.db.election.closed_at, snapshot_hash: 'mock-snapshot-hash' };
        }

        if (url.includes('/api/tally') && method === 'GET') {
            if (this.db.election.status !== 'closed') return { ok: false, error: 'Tally unavailable' };
            const tally = {};
            for (const c of this.db.candidates) tally[c.id] = 0;
            const ageTally = {}, genderTally = {}, stateTally = {}, partyTally = {};
            let total_revealed = 0;
            for (const b of this.db.ballots) {
                if (!b.choice) continue;
                tally[b.choice] = (tally[b.choice] || 0) + 1;
                total_revealed++;
            }
            return {
                ok: true, found: true,
                tally_proof: {
                    election_id: this.db.election.id,
                    election_title: this.db.election.title,
                    tally,
                    candidates: this.db.candidates.map(c => ({ id: c.id, name: c.name })),
                    state_breakdown: stateTally,
                    age_breakdown: ageTally,
                    gender_breakdown: genderTally,
                    party_breakdown: partyTally,
                    total_revealed,
                    snapshot_hash: this.db.election.snapshot_hash,
                    closed_at: this.db.election.closed_at,
                }
            };
        }

        if (url.includes('/api/reset') && method === 'POST') {
            this.db.ballots = [];
            this.db.election.status = 'open';
            this.db.election.chain_head = 'GENESIS';
            this.db.election.snapshot_hash = null;
            this.db.election.closed_at = null;
            this.save();
            return { ok: true };
        }

        if (url.includes('/api/stats') && method === 'GET') {
            return { ok: true, total_elections: 1, open_elections: this.db.election.status === 'open' ? 1 : 0, total_ballots: this.db.ballots.length };
        }

        return { ok: false, error: 'Mock: endpoint not found' };
    }
};

MockServer.init();

// ── API WRAPPER ────────────────────────────────────────────────────────────────
async function apiCall(endpoint, options = {}) {
    const method = options.method || 'GET';
    try {
        const res = await fetch(endpoint, { ...options, signal: AbortSignal.timeout(8000) });
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            return { ok: res.ok, status: res.status, json: async () => res.json() };
        }
        throw new Error('Non-JSON response from server');
    } catch (e) {
        // Fall through to mock on any fetch/network/parse error
        console.warn('Backend unavailable, using mock:', e.message);
        const mockRes = await MockServer.handle(endpoint, method, options.body);
        return { ok: mockRes.ok !== false, status: mockRes.ok ? 200 : 400, json: async () => mockRes };
    }
}

// ── INIT ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Read election ID from ?election_id= or /e/:id
    const params = new URLSearchParams(window.location.search);
    const queryElectionId = params.get('election_id');
    const pathMatch = window.location.pathname.match(/^\/e\/([^/]+)/);
    if (queryElectionId) state.electionId = queryElectionId;
    else if (pathMatch) state.electionId = pathMatch[1];

    // Pre-populate receipt input from ?verify= query param
    const verifyToken = params.get('verify');
    if (verifyToken) {
        const input = $('#receipt-input');
        if (input) { input.value = verifyToken; setTimeout(() => verifyReceipt(), 600); }
    }

    setupEventListeners();
    initApp();
});

async function initApp() {
    updateExportLinks();
    renderCandidates();

    await Promise.all([fetchBoard(), fetchStats()]);
    startPolling();
}

function updateExportLinks() {
    const exportChain = $('#export-chain-btn');
    const exportProof = $('#export-proof-btn');
    if (exportChain) exportChain.href = `/api/chain/export?election_id=${state.electionId}`;
    if (exportProof) exportProof.href = `/api/audit/proof?election_id=${state.electionId}`;
}

// ── EVENT LISTENERS ────────────────────────────────────────────────────────────
function setupEventListeners() {
    $('#cast-vote-btn').addEventListener('click', castVote);
    $('#copy-receipt-btn')?.addEventListener('click', copyReceipt);
    $('#verify-btn').addEventListener('click', verifyReceipt);
    $('#receipt-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') verifyReceipt(); });
    $('#run-audit-btn').addEventListener('click', runAudit);
    $('#demo-mode-toggle').addEventListener('change', toggleDemoMode);
    $('#close-election-btn').addEventListener('click', closeElection);
    $('#reset-election-btn').addEventListener('click', resetElection);
    $('#save-receipt-btn')?.addEventListener('click', downloadReceiptCard);

    // Share buttons
    $('#share-x-btn')?.addEventListener('click', shareOnX);
    $('#share-linkedin-btn')?.addEventListener('click', shareOnLinkedIn);
    $('#share-whatsapp-btn')?.addEventListener('click', shareOnWhatsApp);
    $('#share-instagram-btn')?.addEventListener('click', () => $('#instagram-modal')?.classList.remove('hidden'));
    $('#share-email-btn')?.addEventListener('click', shareByEmail);
    $('#copy-link-btn')?.addEventListener('click', copyVerifyLink);
    $('#ig-close')?.addEventListener('click', () => $('#instagram-modal')?.classList.add('hidden'));
    $('#ig-copy-caption')?.addEventListener('click', () => {
        const text = $('#ig-caption-text')?.textContent || '';
        navigator.clipboard.writeText(text).then(() => showToast('Caption copied', 'success'));
    });
}

// ── POLLING ────────────────────────────────────────────────────────────────────
function startPolling() {
    if (state.pollingInterval) clearInterval(state.pollingInterval);
    const rate = state.election?.status === 'closed' ? 8000 : state.pollingRate;
    state.pollingInterval = setInterval(fetchBoard, rate);
}

function resetPolling() {
    clearInterval(state.pollingInterval);
    state.pollingRate = 1500; // Speed up after a cast
    startPolling();
    setTimeout(() => { state.pollingRate = 3000; resetPolling(); }, 10000);
}

// ── DATA FETCHING ──────────────────────────────────────────────────────────────
async function fetchBoard() {
    try {
        const res = await apiCall(`/api/board?election_id=${state.electionId}`);
        const data = await res.json();
        if (data.ok) {
            state.election = data.election;
            state.ballots = data.ballots || [];
            state.candidates = normalizeCandidateSlate(data.candidates);
            state.mode = data.election.mode || 'safe';
            updateExportLinks();
            renderCandidates();
            renderBoard();
            updateElectionStatus();
        } else {
            state.candidates = normalizeCandidateSlate(state.candidates);
            renderCandidates();
        }
    } catch (e) {
        console.error('fetchBoard error:', e);
        state.candidates = normalizeCandidateSlate(state.candidates);
        renderCandidates();
    }
}

async function fetchStats() {
    try {
        const res = await apiCall('/api/stats');
        const data = await res.json();
        if (data.ok) {
            animateStatCounter('#stat-elections', data.total_elections);
            animateStatCounter('#stat-ballots', data.total_ballots);
            animateStatCounter('#stat-open', data.open_elections);
        }
    } catch (_) {}
}

function animateStatCounter(selector, target) {
    const el = $(selector);
    if (!el) return;
    let current = 0;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    const interval = duration / steps;
    const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        el.textContent = Math.round(current).toLocaleString();
        if (current >= target) clearInterval(timer);
    }, interval);
}

// ── CAST VOTE ──────────────────────────────────────────────────────────────────
async function castVote() {
    if (!state.selectedCandidate) {
        showToast('Please select a candidate first', 'warning');
        return;
    }
    if (state.election?.status === 'closed') {
        showToast('This election is closed', 'error');
        return;
    }

    const btn = $('#cast-vote-btn');
    const label = $('#cast-btn-label');
    btn.disabled = true;
    label.textContent = 'ENCRYPTING…';

    try {
        const receiptToken = Crypto.generateToken();
        const receiptHash = await Crypto.sha256(receiptToken);
        const nonce = Crypto.generateNonce();
        const commitData = `${state.electionId}|${state.selectedCandidate}|${nonce}`;
        const commit = await Crypto.sha256(commitData);

        const body = { election_id: state.electionId, commit, receipt_hash: receiptHash, mode: state.mode };

        if (state.mode === 'demo') {
            body.choice = state.selectedCandidate;
            body.nonce = nonce;
            const ageEl = $('#voter-age');
            const stateEl = $('#voter-state');
            const genderEl = $('#voter-gender');
            const partyEl = $('#voter-party');
            if (ageEl) body.voter_age_group = ageEl.value;
            if (stateEl) body.voter_state = stateEl.value;
            if (genderEl) body.voter_gender = genderEl.value;
            if (partyEl) body.voter_party = partyEl.value;
        }

        label.textContent = 'SEALING…';
        const res = await apiCall('/api/cast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();

        if (data.ok) {
            state.lastReceipt = {
                token: receiptToken,
                index: data.index,
                chainHash: data.chain_hash,
                castAt: data.cast_at,
            };
            showReceiptPanel();
            resetPolling();
            await fetchBoard();
            showToast(`Ballot #${String(data.index).padStart(4, '0')} sealed in chain`, 'success');
        } else {
            showToast('Failed to cast: ' + data.error, 'error');
        }
    } catch (e) {
        console.error('Cast vote error:', e);
        showToast('Failed to cast ballot. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        label.textContent = 'ENCRYPT & CAST BALLOT';
    }
}

// ── RECEIPT PANEL ──────────────────────────────────────────────────────────────
function showReceiptPanel() {
    const panel = $('#receipt-panel');
    const receipt = state.lastReceipt;
    if (!panel || !receipt) return;

    panel.classList.remove('hidden');

    // Populate token box
    $('#receipt-token-box').textContent = receipt.token;

    // Populate share card
    const indexStr = '#' + String(receipt.index).padStart(4, '0');
    const cardIndex = $('#card-index');
    const cardHash = $('#card-hash');
    const cardTimestamp = $('#card-timestamp');

    if (cardIndex) cardIndex.textContent = indexStr;
    if (cardHash) cardHash.textContent = receipt.chainHash.substring(0, 48) + '…';
    if (cardTimestamp) cardTimestamp.textContent = new Date(receipt.castAt).toISOString();

    // Generate QR code for the verify URL
    const verifyUrl = buildVerifyUrl();
    generateQR(verifyUrl);

    // Retrigger thermal animations
    $$('.thermal-line').forEach(el => {
        el.style.animation = 'none';
        requestAnimationFrame(() => { el.style.animation = ''; });
    });
}

function buildVerifyUrl() {
    const token = state.lastReceipt?.token || '';
    return buildPrototypePageUrl('index.html', state.electionId, { verify: token });
}

function generateQR(url) {
    const container = $('#receipt-qr');
    if (!container || !window.QRCode) return;
    container.innerHTML = '';
    try {
        QRCode.toCanvas(url, {
            width: 80, margin: 1,
            color: { dark: '#60A5FA', light: '#05050F' },
            errorCorrectionLevel: 'M',
        }, (err, canvas) => {
            if (err) { console.warn('QR error:', err); return; }
            canvas.style.borderRadius = '6px';
            container.appendChild(canvas);
        });
    } catch (e) {
        console.warn('QR generation failed:', e);
    }
}

// ── DOWNLOAD RECEIPT CARD (Canvas) ────────────────────────────────────────────
async function downloadReceiptCard() {
    const receipt = state.lastReceipt;
    if (!receipt) return;

    const btn = $('#save-receipt-btn');
    if (btn) { btn.disabled = true; btn.querySelector('span') && (btn.querySelector('span').textContent = 'Rendering…'); }

    try {
        await document.fonts.ready;

        const W = 720, H = 400;
        const canvas = document.createElement('canvas');
        canvas.width = W * 2; canvas.height = H * 2; // Retina
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // Background
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#05050f');
        bg.addColorStop(0.4, '#080820');
        bg.addColorStop(1, '#060616');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Aurora blobs
        const aurora1 = ctx.createRadialGradient(180, 100, 0, 180, 100, 280);
        aurora1.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
        aurora1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aurora1; ctx.fillRect(0, 0, W, H);

        const aurora2 = ctx.createRadialGradient(560, 320, 0, 560, 320, 220);
        aurora2.addColorStop(0, 'rgba(79, 70, 229, 0.22)');
        aurora2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aurora2; ctx.fillRect(0, 0, W, H);

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 16);
        ctx.stroke();

        // Top accent line
        const topLine = ctx.createLinearGradient(0, 0, W, 0);
        topLine.addColorStop(0, 'transparent');
        topLine.addColorStop(0.5, 'rgba(37,99,235,0.7)');
        topLine.addColorStop(1, 'transparent');
        ctx.strokeStyle = topLine; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, 1); ctx.lineTo(W - 40, 1); ctx.stroke();

        // Header label
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = '10px "JetBrains Mono"';
        ctx.letterSpacing = '0.3em';
        ctx.fillText('THE GLASS BALLOT BOX', 44, 50);

        // "BALLOT SEALED"
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px "Playfair Display"';
        ctx.letterSpacing = '0em';
        ctx.fillText('BALLOT SEALED', 44, 104);

        // Index
        ctx.fillStyle = '#60A5FA';
        ctx.font = 'bold 76px "JetBrains Mono"';
        const indexStr = '#' + String(receipt.index).padStart(4, '0');
        ctx.fillText(indexStr, 40, 200);

        // Hash label
        ctx.fillStyle = 'rgba(156,163,175,0.6)';
        ctx.font = '9px "JetBrains Mono"';
        ctx.letterSpacing = '0.12em';
        ctx.fillText('CHAIN HASH', 44, 236);

        // Hash value
        ctx.fillStyle = 'rgba(96,165,250,0.65)';
        ctx.font = '11px "JetBrains Mono"';
        ctx.letterSpacing = '0em';
        ctx.fillText(receipt.chainHash.substring(0, 40) + '…', 44, 256);

        // Timestamp
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillText(new Date(receipt.castAt).toISOString(), 44, 280);

        // Attribution
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.font = '9px "JetBrains Mono"';
        ctx.fillText('Research by Abhinav Raj · abhnv.in', 44, H - 22);

        // QR code — try to grab from the DOM canvas
        const qrEl = $('#receipt-qr canvas');
        if (qrEl) {
            try {
                ctx.save();
                ctx.globalAlpha = 0.9;
                ctx.drawImage(qrEl, W - 130, H - 130, 96, 96);
                ctx.globalAlpha = 1;
                ctx.restore();
            } catch (_) {}
        }

        // Download
        const link = document.createElement('a');
        link.download = `ballot-${String(receipt.index).padStart(4, '0')}-receipt.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Receipt saved as PNG', 'success');
    } catch (e) {
        console.error('Download error:', e);
        showToast('Failed to save receipt', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            const span = btn.querySelector('span');
            if (span) span.textContent = 'Save Receipt';
        }
    }
}

// Canvas roundRect helper (Safari compat)
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ── SHARE ACTIONS ──────────────────────────────────────────────────────────────
function shareOnX() {
    const verifyUrl = encodeURIComponent(buildVerifyUrl());
    const index = state.lastReceipt ? '#' + String(state.lastReceipt.index).padStart(4, '0') : '';
    const text = encodeURIComponent(`Just cast a cryptographically verifiable ballot ${index}. No trust required — my vote is sealed in a chain hash anyone can audit. This is what elections should look like. @Abhnv8 🔐`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${verifyUrl}`, '_blank', 'noopener');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(buildVerifyUrl());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener');
}

function shareOnWhatsApp() {
    const verifyUrl = buildVerifyUrl();
    const index = state.lastReceipt ? ' #' + String(state.lastReceipt.index).padStart(4, '0') : '';
    const text = encodeURIComponent(`Check this out — someone built a voting system where you can mathematically prove your vote was counted without anyone knowing who you voted for. I just cast ballot${index}. Wild concept: ${verifyUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
}

function shareByEmail() {
    const receipt = state.lastReceipt;
    const verifyUrl = buildVerifyUrl();
    const index = receipt ? '#' + String(receipt.index).padStart(4, '0') : '—';
    const hash = receipt ? receipt.chainHash.substring(0, 32) + '…' : '—';
    const subject = encodeURIComponent('Your vote can be mathematically verified — The Glass Ballot Box');
    const body = encodeURIComponent(
        `Hey,\n\nI came across a research project that might interest you — it's a cryptographic voting system that makes election integrity mathematically provable without needing a trusted authority.\n\n` +
        `I just cast ballot ${index}. Here are the details:\n\n` +
        `  Chain hash: ${hash}\n` +
        `  Verify link: ${verifyUrl}\n\n` +
        `You can paste the receipt token at the link above and independently verify in your browser — no account, no trust, just math.\n\n` +
        `Built by Abhinav Raj (17) · abhnv.in\n`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyVerifyLink() {
    const verifyUrl = buildVerifyUrl();
    navigator.clipboard.writeText(verifyUrl).then(() => {
        const btn = $('#copy-link-btn');
        if (btn) {
            btn.classList.add('stamped');
            const label = $('#copy-link-label');
            if (label) { const orig = label.textContent; label.textContent = 'Copied ✓'; setTimeout(() => label.textContent = orig, 2000); }
            setTimeout(() => btn.classList.remove('stamped'), 400);
        }
    }).catch(() => showToast('Failed to copy link', 'error'));
}

// ── COPY RECEIPT ───────────────────────────────────────────────────────────────
function copyReceipt() {
    const token = state.lastReceipt?.token;
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
        const btn = $('#copy-receipt-btn');
        if (btn) { const orig = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = orig, 2000); }
    }).catch(() => showToast('Failed to copy', 'error'));
}

// ── VERIFY RECEIPT ─────────────────────────────────────────────────────────────
async function verifyReceipt() {
    const input = $('#receipt-input');
    const token = input?.value?.trim();
    if (!token) { showToast('Please enter a receipt token', 'warning'); return; }

    const btn = $('#verify-btn');
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>';

    try {
        const receiptHash = await Crypto.sha256(token);
        const res = await apiCall(`/api/receipt?election_id=${state.electionId}&receipt_hash=${receiptHash}`);
        const data = await res.json();
        const resultDiv = $('#verify-result');
        resultDiv.classList.remove('hidden');

        if (data.found && data.ballot) {
            const b = data.ballot;
            const candidate = state.candidates.find(c => c.id === b.choice);
            resultDiv.className = 'bg-green-500/10 border border-green-500/30 rounded-2xl p-6 animate-fade-in';
            resultDiv.innerHTML = `
                <div class="flex items-center gap-3 text-green-400 text-lg font-serif mb-5">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    Receipt Verified — Your vote is on the chain.
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-5">
                    <div class="bg-black/30 p-3 rounded-xl">
                        <div class="text-paper-muted text-[10px] uppercase tracking-wider mb-1">Ballot Index</div>
                        <div class="text-brand-glow font-mono font-bold text-lg">#${String(b.index).padStart(4, '0')}</div>
                    </div>
                    <div class="bg-black/30 p-3 rounded-xl">
                        <div class="text-paper-muted text-[10px] uppercase tracking-wider mb-1">Cast At</div>
                        <div class="text-paper-text font-mono text-xs">${new Date(b.cast_at).toLocaleString()}</div>
                    </div>
                    <div class="bg-black/30 p-3 rounded-xl col-span-2">
                        <div class="text-paper-muted text-[10px] uppercase tracking-wider mb-1">Chain Hash</div>
                        <div class="text-brand-glow font-mono text-[10px] break-all">${b.chain_hash}</div>
                    </div>
                </div>
                ${b.choice ? `
                <div class="bg-blue-900/10 border border-brand-blue/20 p-5 rounded-xl">
                    <div class="text-brand-glow text-[10px] uppercase tracking-widest text-center mb-4 font-bold">Simulation Mode — Verified Payload</div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div><span class="text-paper-muted text-xs">Choice:</span> <span class="text-white">${candidate?.name || b.choice}</span></div>
                        <div><span class="text-paper-muted text-xs">Age:</span> <span class="text-white">${b.voter_age_group || '—'}</span></div>
                        <div><span class="text-paper-muted text-xs">State:</span> <span class="text-white">${b.voter_state || '—'}</span></div>
                        <div><span class="text-paper-muted text-xs">Gender:</span> <span class="text-white">${b.voter_gender || '—'}</span></div>
                    </div>
                    <p class="text-[10px] text-paper-muted text-center mt-4 italic">In production (Safe Mode) these fields are never stored.</p>
                </div>` : ''}
            `;
            highlightBallotRow(b.index);
            state.verifiedBallots.add(b.index);
            renderBoard();
        } else {
            resultDiv.className = 'bg-red-500/10 border border-red-500/30 rounded-2xl p-6 animate-fade-in';
            resultDiv.innerHTML = `
                <div class="flex items-center gap-3 text-red-400 text-lg font-serif mb-2">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Receipt Not Found
                </div>
                <p class="text-paper-muted text-sm">This token was not found in the election chain. Please check that you entered it correctly.</p>
            `;
        }
    } catch (e) {
        console.error('Verify error:', e);
        showToast('Failed to verify receipt', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verify';
    }
}

// ── AUDIT ──────────────────────────────────────────────────────────────────────
async function runAudit() {
    const btn = $('#run-audit-btn');
    btn.disabled = true;
    const terminalBody = $('#terminal-body');
    const progressDiv = $('#audit-progress');
    const progressFill = $('#progress-fill');
    progressDiv.classList.remove('hidden');
    progressFill.style.width = '0%';
    terminalBody.innerHTML = '';

    const log = (text, cls = 'text-paper-muted') => {
        const line = document.createElement('div');
        line.className = cls;
        line.textContent = text;
        terminalBody.appendChild(line);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    };

    log('GLASS BALLOT BOX — INDEPENDENT AUDIT v2.1.0', 'text-brand-glow font-bold');
    log(`Election: ${state.electionId}`, 'text-paper-muted/60');
    log('');
    log('Fetching public ledger…', 'text-paper-muted');

    await delay(300);

    try {
        const boardRes = await apiCall(`/api/board?election_id=${state.electionId}`);
        const boardData = await boardRes.json();

        if (!boardData.ok) { log('ERROR: ' + (boardData.error || 'fetch failed'), 'text-red-400'); return; }

        const ballots = (boardData.ballots || []).sort((a, b) => a.index - b.index);
        const expectedHead = boardData.election.chain_head;

        log(`Loaded ${ballots.length} ballot record(s).`, 'text-paper-muted');

        if (ballots.length === 0) {
            log('');
            log('No ballots to verify. Chain is in GENESIS state.', 'text-yellow-400');
            log('');
            log('AUDIT RESULT: CHAIN EMPTY (nothing to verify)', 'text-yellow-400 font-bold');
            progressFill.style.width = '100%';
            return;
        }

        log('');
        log('Verifying cryptographic chain…', 'text-paper-muted');
        log('');

        let computedHead = 'GENESIS';
        let chainValid = true;
        let errorCount = 0;

        for (let i = 0; i < ballots.length; i++) {
            const ballot = ballots[i];
            progressFill.style.width = ((i + 1) / ballots.length * 95) + '%';

            if (i > 0 && i % 5 === 0) await delay(20);

            let blockOk = true;

            if (ballot.prev_hash !== computedHead) {
                log(`  BLOCK ${ballot.index}: prev_hash MISMATCH — chain broken`, 'text-red-400');
                chainValid = false; blockOk = false; errorCount++;
            }

            const expectedHash = await Crypto.computeChainHash(
                ballot.prev_hash, state.electionId, ballot.index, ballot.commit, ballot.cast_at
            );

            if (ballot.chain_hash !== expectedHash) {
                log(`  BLOCK ${ballot.index}: chain_hash MISMATCH — data tampered`, 'text-red-400');
                chainValid = false; blockOk = false; errorCount++;
            }

            if (blockOk) log(`  BLOCK ${ballot.index}: ✓ ${ballot.chain_hash.substring(0, 20)}…`, 'text-green-500/70');
            computedHead = ballot.chain_hash;
        }

        const headMatches = computedHead === expectedHead;
        if (!headMatches && ballots.length > 0) { chainValid = false; log('  FINAL HEAD: mismatch with stored value', 'text-red-400'); }

        progressFill.style.width = '100%';
        await delay(200);
        log('');

        if (chainValid) {
            log('CHAIN INTEGRITY: VERIFIED ✓', 'text-green-400 font-bold');
            log(`All ${ballots.length} block(s) verified. Zero anomalies detected.`, 'text-green-400/70');
            log(`Final chain head: ${computedHead.substring(0, 32)}…`, 'text-brand-glow/60');
            log('');
            log('AUDIT RESULT: PASS', 'text-green-400 font-bold');
        } else {
            log(`CHAIN INTEGRITY: COMPROMISED (${errorCount} error(s))`, 'text-red-400 font-bold');
            log('');
            log('AUDIT RESULT: FAIL', 'text-red-400 font-bold');
        }

    } catch (e) {
        log('ERROR: ' + e.message, 'text-red-400');
    } finally {
        btn.disabled = false;
    }
}

// ── CLOSE ELECTION ─────────────────────────────────────────────────────────────
function closeElection() {
    showConfirm('Close this election?', 'The chain will be sealed with a snapshot hash. This cannot be undone.', async () => {
        const btn = $('#close-election-btn');
        btn.disabled = true;
        try {
            const res = await apiCall('/api/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ election_id: state.electionId }),
            });
            const data = await res.json();
            if (data.ok) {
                showToast('Election closed. Chain sealed.', 'success');
                await fetchBoard();
                resetPolling(); // Switch to slow polling for closed election
                if (state.mode === 'demo') {
                    try {
                        const tallyRes = await apiCall(`/api/tally?election_id=${state.electionId}`);
                        const tallyData = await tallyRes.json();
                        if (tallyData.ok && tallyData.tally_proof) showTallyResults(tallyData.tally_proof);
                    } catch (e) { console.error('Tally fetch failed:', e); }
                }
            } else {
                showToast('Failed: ' + data.error, 'error');
            }
        } catch (e) {
            showToast('Failed to close election', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

// ── RESET ELECTION ─────────────────────────────────────────────────────────────
function resetElection() {
    showConfirm('Reset simulation?', 'All ballots will be permanently deleted and the chain will return to GENESIS.', async () => {
        try {
            const res = await apiCall('/api/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ election_id: state.electionId }),
            });
            const data = await res.json();
            if (data.ok) {
                showToast('Simulation reset to GENESIS', 'info');
                state.lastReceipt = null;
                state.selectedCandidate = null;
                state.verifiedBallots.clear();
                // Reset UI
                $('#tally-results')?.classList.add('hidden');
                $('#receipt-panel')?.classList.add('hidden');
                $('#verify-result')?.classList.add('hidden');
                const toggle = $('#demo-mode-toggle');
                if (toggle) { toggle.checked = false; toggleDemoMode(); }
                $$('.candidate-btn').forEach(b => {
                    b.classList.remove('border-brand-blue', 'bg-brand-blue/10', 'text-brand-glow');
                    b.querySelector('.candidate-radio')?.classList.remove('bg-brand-blue', 'border-brand-blue');
                });
                await fetchBoard();
            } else {
                showToast('Failed: ' + data.error, 'error');
            }
        } catch (e) {
            showToast('Failed to reset', 'error');
        }
    });
}

// ── UI RENDERING ───────────────────────────────────────────────────────────────
function renderCandidates() {
    const list = $('#candidates-list');
    const countPill = $('#candidate-count-pill');
    if (!list) return;

    const candidates = normalizeCandidateSlate(state.candidates);
    state.candidates = candidates;
    if (countPill) countPill.textContent = `${candidates.length} candidates loaded`;
    if (state.selectedCandidate && !candidates.some((candidate) => candidate.id === state.selectedCandidate)) {
        state.selectedCandidate = null;
    }

    const signature = JSON.stringify(candidates.map(({ id, name, party, platform }) => [id, name, party, platform]));
    if (list.dataset.signature === signature) {
        if (state.selectedCandidate) selectCandidate(state.selectedCandidate);
        return;
    }
    list.dataset.signature = signature;

    list.innerHTML = candidates.map((candidate, index) => `
        <button data-candidate="${candidate.id}" aria-pressed="false"
            class="candidate-btn group w-full px-6 py-6 md:px-7 md:py-7 text-left border border-white/8 rounded-[1.75rem] transition-all font-sans flex items-start gap-5 bg-gradient-to-br from-white/[0.05] via-black/30 to-black/50 hover:from-brand-blue/10 hover:to-black/60 hover:border-brand-blue/40 hover:-translate-y-1 shadow-[0_16px_40px_rgba(0,0,0,0.28)] relative overflow-hidden">
            <div class="relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-brand-glow font-mono text-sm md:text-base tracking-[0.18em] flex-shrink-0">
                ${String(index + 1).padStart(2, '0')}
            </div>
            <div class="relative z-10 flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-3 mb-3">
                    <span class="text-xl md:text-2xl font-semibold text-white group-hover:text-brand-glow transition-colors leading-tight">${candidate.name}</span>
                    <span class="inline-flex items-center rounded-full border border-brand-blue/20 bg-brand-blue/10 px-3 py-1 text-[11px] md:text-xs font-mono uppercase tracking-[0.22em] text-brand-glow/90">${candidate.party}</span>
                </div>
                <p class="text-sm md:text-base text-paper-muted/85 leading-relaxed max-w-2xl">${candidate.platform || 'This slate is public. Your actual vote stays sealed inside the commit until reveal.'}</p>
            </div>
            <div class="w-7 h-7 rounded-full border-2 border-paper-muted/60 candidate-radio transition-all flex-shrink-0 mt-1 group-hover:border-brand-blue"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_45%),linear-gradient(135deg,transparent,rgba(37,99,235,0.06))] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </button>
    `).join('');

    $$('.candidate-btn').forEach(btn => {
        btn.addEventListener('click', () => selectCandidate(btn.dataset.candidate));
    });

    if (state.selectedCandidate) selectCandidate(state.selectedCandidate);
}

function selectCandidate(candidate) {
    state.selectedCandidate = candidate;
    $$('.candidate-btn').forEach(btn => {
        const selected = btn.dataset.candidate === candidate;
        const radio = btn.querySelector('.candidate-radio');
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
        btn.classList.toggle('border-brand-blue', selected);
        btn.classList.toggle('bg-brand-blue/10', selected);
        btn.classList.toggle('text-brand-glow', selected);
        btn.classList.toggle('-translate-y-1', selected);
        btn.classList.toggle('shadow-[0_20px_50px_rgba(37,99,235,0.18)]', selected);
        if (radio) {
            radio.classList.toggle('bg-brand-blue', selected);
            radio.classList.toggle('border-brand-blue', selected);
            radio.style.boxShadow = selected ? 'inset 0 0 0 5px #0A0A0A' : '';
        }
    });
}

function renderBoard() {
    const tbody = $('#board-tbody');
    const countEl = $('#ballot-count');
    const heightEl = $('#block-height');
    const headEl = $('#chain-head-short');

    if (countEl) countEl.textContent = state.ballots.length;
    if (heightEl) heightEl.textContent = state.ballots.length; // Bug #4 fix
    const head = state.election?.chain_head || 'GENESIS';
    if (headEl) headEl.textContent = head === 'GENESIS' ? 'GENESIS' : (head.substring(0, 8) + '…');

    if (!state.ballots.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-paper-muted/50 italic font-light">Waiting for first ballot block…</td></tr>`;
        return;
    }

    const sorted = [...state.ballots].sort((a, b) => b.index - a.index);
    tbody.innerHTML = sorted.map(ballot => {
        const isUser = state.lastReceipt && ballot.index === state.lastReceipt.index;
        const isVerified = state.verifiedBallots.has(ballot.index);
        return `
            <tr data-index="${ballot.index}" class="${isUser ? 'bg-brand-blue/10' : 'hover:bg-white/3'} transition-colors border-b border-white/5 last:border-0">
                <td class="px-6 py-3 text-paper-muted/60 font-mono text-xs">#${String(ballot.index).padStart(4, '0')}</td>
                <td class="px-6 py-3 text-paper-muted font-mono text-xs">${new Date(ballot.cast_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })}</td>
                <td class="px-6 py-3 font-mono text-xs">
                    <span class="text-paper-text">${ballot.commit.substring(0, 10)}…</span>
                    ${isUser ? '<span class="ml-2 px-1.5 py-0.5 bg-brand-blue text-white rounded text-[8px] font-bold tracking-widest">YOU</span>' : ''}
                </td>
                <td class="px-6 py-3 font-mono text-xs">
                    ${isUser && isVerified ? '<span class="text-green-400 text-[10px]">✓ Verified by you</span>'
                    : isUser ? '<span class="text-yellow-400/80 text-[9px] font-bold uppercase tracking-wider border border-yellow-500/30 px-2 py-0.5 rounded animate-pulse">Verify Receipt</span>'
                    : '<span class="text-paper-muted/40 text-[10px]">Sealed</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function highlightBallotRow(index) {
    $$('#board-tbody tr').forEach(r => r.classList.remove('bg-brand-blue/20'));
    const row = $(`#board-tbody tr[data-index="${index}"]`);
    if (row) row.classList.add('bg-brand-blue/20');
}

function updateElectionStatus() {
    const statusEl = $('#election-status');
    const castBtn = $('#cast-vote-btn');
    const closeBtn = $('#close-election-btn');

    const isClosed = state.election?.status === 'closed';

    if (statusEl) {
        statusEl.className = isClosed
            ? 'flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full'
            : 'flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full';
        statusEl.innerHTML = isClosed
            ? '<div class="w-1.5 h-1.5 rounded-full bg-red-400"></div> Closed'
            : '<div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div> Open';
    }
    if (castBtn) castBtn.disabled = isClosed;
    if (closeBtn) closeBtn.disabled = isClosed;
}

function toggleDemoMode() {
    const toggle = $('#demo-mode-toggle');
    const warning = $('#demo-warning');
    const profileSection = $('#voter-profile-section');

    state.mode = toggle.checked ? 'demo' : 'safe';
    warning?.classList.toggle('hidden', !toggle.checked);
    profileSection?.classList.toggle('hidden', !toggle.checked);
}

// ── TALLY RESULTS (Election Night Ceremony) ───────────────────────────────────
function showTallyResults(tallyProof) {
    const div = $('#tally-results');
    if (!div) return;

    const { tally, candidates = [], total_revealed, snapshot_hash, closed_at } = tallyProof;
    const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);

    let winnerId = null, maxVotes = -1;
    for (const [id, votes] of Object.entries(tally)) {
        if (votes > maxVotes) { maxVotes = votes; winnerId = id; }
    }

    const getCandName = (id) => candidates.find(c => c.id === id)?.name || id;

    // ── Step 1: Show ceremony overlay ──────────────────────────────────────────
    const overlay = $('#tally-ceremony-overlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => $('#ceremony-subtitle')?.classList.add('show'), 100);
        setTimeout(() => $('#ceremony-title')?.classList.add('show'), 400);
        setTimeout(() => {
            const d = $('#ceremony-dismiss');
            if (d) d.style.opacity = '1';
        }, 1400);
    }

    // ── Step 2: Build results HTML (hidden until ceremony dismissed) ───────────
    div.classList.remove('hidden');
    div.innerHTML = `
        <div class="glass-panel rounded-3xl p-8 md:p-12 border border-white/10" id="tally-results-inner" style="opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease">
            <!-- Header -->
            <div class="text-center mb-12">
                <div class="inline-block px-5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full font-mono text-xs text-amber-400 uppercase tracking-[0.2em] mb-6">
                    Election Night · Official Results
                </div>
                <h3 class="text-5xl md:text-6xl font-serif font-bold text-white mb-3">Final Results</h3>
                <p class="text-paper-muted font-mono text-sm">${totalVotes.toLocaleString()} ballot${totalVotes !== 1 ? 's' : ''} cast · ${total_revealed} nonces verified</p>
            </div>

            <!-- Candidate Results -->
            <div class="space-y-4 mb-12" id="candidate-results">
                ${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([id, votes], i) => {
                    const pct = totalVotes > 0 ? (votes / totalVotes * 100) : 0;
                    const isWinner = id === winnerId && votes > 0;
                    return `
                    <div class="winner-card tally-candidate-row rounded-2xl" data-id="${id}" style="transition-delay:${i * 180}ms">
                        <div class="rounded-2xl p-6 ${isWinner ? 'bg-gradient-to-r from-amber-500/8 to-black/60 border border-amber-500/25' : 'bg-black/40 border border-white/6'}">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-3 min-w-0 flex-1">
                                    ${isWinner ? `<svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>` : '<div class="w-5 h-5 flex-shrink-0"></div>'}
                                    <span class="font-serif text-lg ${isWinner ? 'text-amber-100' : 'text-white'} truncate">${getCandName(id)}</span>
                                </div>
                                <div class="flex items-baseline gap-3 flex-shrink-0 ml-4">
                                    <span class="vote-counter font-mono text-4xl font-bold ${isWinner ? 'text-amber-300' : 'text-brand-glow'}" data-target="${votes}">0</span>
                                    <span class="text-paper-muted text-base font-mono">${pct.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div class="result-bar h-full ${isWinner ? 'bg-gradient-to-r from-amber-600 to-amber-300' : 'bg-brand-blue'} rounded-full"
                                     style="--target-width: ${pct.toFixed(1)}%; box-shadow: 0 0 12px ${isWinner ? 'rgba(245,158,11,0.6)' : 'rgba(37,99,235,0.5)'}"></div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            <!-- Demographics -->
            ${buildDemographics(tallyProof, getCandName)}

            <!-- Verified Badge -->
            <div class="verified-badge text-center mt-10 mb-6" id="verified-badge">
                <div class="inline-flex items-center gap-3 px-8 py-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <svg class="text-green-400 w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    <span class="text-green-400 font-bold tracking-wide">Cryptographic Tally Verified</span>
                </div>
            </div>

            <!-- Snapshot Hash -->
            ${snapshot_hash ? `
            <div class="bg-black/40 border border-white/5 rounded-xl p-5 text-center">
                <p class="text-[10px] text-paper-muted uppercase tracking-widest font-mono mb-2">Election Snapshot Hash (Final Seal)</p>
                <p class="font-mono text-xs text-brand-glow/70 break-all">${snapshot_hash}</p>
                ${closed_at ? `<p class="text-[10px] text-paper-muted/50 font-mono mt-2">Sealed at ${new Date(closed_at).toISOString()}</p>` : ''}
            </div>` : ''}
        </div>
    `;

    // ── Step 3: Dismiss ceremony and animate in results ────────────────────────
    window.closeTallyCeremony = () => {
        const overlay = $('#tally-ceremony-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
                delete window.closeTallyCeremony;
            }, 500);
        }

        const inner = $('#tally-results-inner');
        if (inner) {
            inner.style.opacity = '1';
            inner.style.transform = 'translateY(0)';
        }

        div.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Stagger candidate rows in
        const rows = $$('.tally-candidate-row');
        rows.forEach((row) => row.classList.add('show'));

        // Start bar + counter animation
        setTimeout(() => {
            $$('.result-bar').forEach(bar => bar.classList.add('animated'));

            $$('.vote-counter').forEach(counter => {
                const target = parseInt(counter.dataset.target, 10);
                if (target === 0) { counter.textContent = '0'; return; }
                let current = 0;
                const duration = 1600;
                const steps = 50;
                const interval = duration / steps;
                const timer = setInterval(() => {
                    current = Math.min(current + Math.ceil(target / steps), target);
                    counter.textContent = current.toLocaleString();
                    if (current >= target) clearInterval(timer);
                }, interval);
            });

            // Crown winner
            setTimeout(() => {
                const winnerCard = $(`[data-id="${winnerId}"]`);
                if (winnerCard) winnerCard.classList.add('crowned');
            }, 1000);

            // Verified badge last
            setTimeout(() => {
                $('#verified-badge')?.classList.add('show');
            }, 2200);
        }, 300);
    };

    // Auto-dismiss after 4s if user doesn't click
    const autoDismiss = setTimeout(() => {
        if (window.closeTallyCeremony) window.closeTallyCeremony();
    }, 4000);
    // Cancel auto-dismiss if user clicks manually
    const dismissBtn = document.querySelector('#ceremony-dismiss button');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => clearTimeout(autoDismiss), { once: true });
    }
}

function buildDemographics(tp, getCandName) {
    const { age_breakdown, gender_breakdown, state_breakdown, party_breakdown } = tp;
    const sections = [
        { label: 'Age Group', data: age_breakdown },
        { label: 'Gender', data: gender_breakdown },
        { label: 'State / Region', data: state_breakdown },
        { label: 'Voter Identity', data: party_breakdown },
    ].filter(s => s.data && Object.keys(s.data).length > 0);

    if (!sections.length) return '';

    return `
        <div class="border-t border-white/5 pt-8 mt-8">
            <h4 class="text-sm font-bold text-paper-muted uppercase tracking-widest mb-6">Demographic Breakdown</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${sections.map(({ label, data }) => {
                    const rows = Object.entries(data);
                    const total = rows.reduce((sum, [, d]) => sum + Object.values(d).reduce((a, b) => a + b, 0), 0);
                    return `
                    <div class="bg-black/30 border border-white/5 rounded-2xl p-5">
                        <p class="text-[10px] text-paper-muted uppercase tracking-widest font-mono mb-4">${label}</p>
                        <div class="space-y-3">
                            ${rows.map(([key, votes]) => {
                                const count = Object.values(votes).reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? (count / total * 100) : 0;
                                return `
                                <div>
                                    <div class="flex justify-between text-xs mb-1">
                                        <span class="text-white">${key}</span>
                                        <span class="text-paper-muted font-mono">${count} · ${pct.toFixed(0)}%</span>
                                    </div>
                                    <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full bg-brand-blue/60 rounded-full transition-all duration-1000 result-bar" style="--target-width: ${pct.toFixed(1)}%"></div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── CHAIN CARD 3D TILT EFFECT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.chain-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const dx = (x - cx) / cx;
            const dy = (y - cy) / cy;
            card.style.transform = `translateY(-12px) rotateY(${dx * 8}deg) rotateX(${-dy * 6}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
});

// Expose showToast globally (used inline in HTML)
window.showToast = showToast;
