-- Phase 23: Feature Flags V2

CREATE TABLE IF NOT EXISTS feature_flags_v2 (
    key TEXT PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'OFF', -- 'OFF', 'ON', 'PERCENT', 'WHITELIST'
    percent INTEGER DEFAULT 0, -- 0-100
    whitelist_json TEXT DEFAULT '[]', -- JSON array of wallets/ids
    description TEXT,
    updated_at INTEGER,
    updated_by TEXT
);

-- Seed defaults
INSERT OR IGNORE INTO feature_flags_v2 (key, mode, description, updated_at, updated_by) 
VALUES ('beta_features', 'WHITELIST', 'Access to beta features', strftime('%s','now')*1000, 'system');

INSERT OR IGNORE INTO feature_flags_v2 (key, mode, description, updated_at, updated_by) 
VALUES ('ops_execution', 'ON', 'Allow billable ops execution', strftime('%s','now')*1000, 'system');

INSERT OR IGNORE INTO feature_flags_v2 (key, mode, description, updated_at, updated_by) 
VALUES ('simulated_settlement', 'OFF', 'Enable V2 Settlement simulation', strftime('%s','now')*1000, 'system');
