-- Drop existing tables if recreating schema
DROP TABLE IF EXISTS reveals;
DROP TABLE IF EXISTS ballots;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS elections;

-- ELECTIONS TABLE
CREATE TABLE elections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    chain_head TEXT NOT NULL DEFAULT 'GENESIS',
    mode TEXT NOT NULL DEFAULT 'safe',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    snapshot_hash TEXT
);

-- CANDIDATES TABLE
CREATE TABLE candidates (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL,
    name TEXT NOT NULL,
    party TEXT NOT NULL,
    platform TEXT,
    avatar_url TEXT,
    FOREIGN KEY(election_id) REFERENCES elections(id)
);

-- BALLOTS TABLE (Append Only Log)
CREATE TABLE ballots (
    ballot_id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL,
    `index` INTEGER NOT NULL,
    cast_at DATETIME NOT NULL,
    commit_hash TEXT NOT NULL,
    receipt_hash TEXT NOT NULL UNIQUE,
    prev_hash TEXT NOT NULL,
    chain_hash TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL,
    FOREIGN KEY(election_id) REFERENCES elections(id)
);

-- REVEALS & DEMOGRAPHICS TABLE (Demo mode)
CREATE TABLE reveals (
    reveal_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ballot_id TEXT NOT NULL UNIQUE,
    election_id TEXT NOT NULL,
    choice TEXT NOT NULL,     -- Matches candidates.id
    nonce TEXT NOT NULL,
    -- Demographics
    voter_age_group TEXT,     -- e.g. "18-25", "26-35"
    voter_state TEXT,         -- e.g. "TX", "CA", "NY"
    voter_party TEXT,         -- e.g. "Independent", "Democrat", "Republican"
    voter_gender TEXT,        -- "Male", "Female", "Other"
    FOREIGN KEY(ballot_id) REFERENCES ballots(ballot_id),
    FOREIGN KEY(election_id) REFERENCES elections(id),
    FOREIGN KEY(choice) REFERENCES candidates(id)
);

-- INSERT INITIAL DEMO ELECTION
INSERT INTO elections (id, title, status, chain_head, mode)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'Glass Ballot Box Demo (India National Mock Election)',
    'open',
    'GENESIS',
    'demo'
);

-- INSERT DEMO CANDIDATES
INSERT INTO candidates (id, election_id, name, party, platform, avatar_url)
VALUES 
    ('CAND-A', 'e0000000-0000-0000-0000-000000000001', 'Progressive India Alliance', 'Progressive India Alliance', 'Universal Digital Infrastructure, Green Energy Expansion, Education Reform.', 'https://api.dicebear.com/7.x/notionists/svg?seed=Aarav&backgroundColor=b6e3f4'),
    ('CAND-B', 'e0000000-0000-0000-0000-000000000001', 'National Democratic Front', 'National Democratic Front', 'Economic Deregulation, Strong Border Security, Manufacturing Hub.', 'https://api.dicebear.com/7.x/notionists/svg?seed=Bharat&backgroundColor=ffdfbf'),
    ('CAND-C', 'e0000000-0000-0000-0000-000000000001', 'Independent Voice', 'Independent Voice', 'Local Governance, Agricultural Subsidies, Healthcare Access.', 'https://api.dicebear.com/7.x/notionists/svg?seed=Chandrika&backgroundColor=c0aede');
