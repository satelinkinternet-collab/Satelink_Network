-- Phase O: Node Lifecycle Management

-- 1. Setup Sessions (Wizard State)
CREATE TABLE IF NOT EXISTS node_setup_sessions (
    setup_id TEXT PRIMARY KEY,
    owner_wallet TEXT NOT NULL,
    pairing_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paired, expired
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

-- 2. Node Ownership (Secure Binding)
CREATE TABLE IF NOT EXISTS node_ownership (
    node_id TEXT PRIMARY KEY,
    owner_wallet TEXT NOT NULL,
    paired_at INTEGER NOT NULL,
    revoked_at INTEGER
);

-- 3. Diagnostic Bundles (Redacted Logs)
CREATE TABLE IF NOT EXISTS node_diag_bundles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    bundle_json TEXT NOT NULL, -- Redacted JSON
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diag_node ON node_diag_bundles(node_id);

-- 4. Remediation Suggestions
CREATE TABLE IF NOT EXISTS node_remediation_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    suggestion_json TEXT NOT NULL, -- { action: "restart", reason: "High CPU" }
    severity TEXT NOT NULL, -- low, medium, critical
    status TEXT NOT NULL DEFAULT 'open', -- open, done, dismissed
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_remed_node ON node_remediation_suggestions(node_id);

-- 5. Release Policy (Upgrade Gates)
CREATE TABLE IF NOT EXISTS node_release_policy (
    channel TEXT PRIMARY KEY, -- stable, beta, nightly
    min_version TEXT NOT NULL,
    build_hash TEXT,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
);

-- Seed Default Policies
INSERT OR IGNORE INTO node_release_policy (channel, min_version, updated_at, updated_by)
VALUES ('stable', '1.0.0', strftime('%s','now')*1000, 'system');

INSERT OR IGNORE INTO node_release_policy (channel, min_version, updated_at, updated_by)
VALUES ('beta', '1.1.0-beta.1', strftime('%s','now')*1000, 'system');
