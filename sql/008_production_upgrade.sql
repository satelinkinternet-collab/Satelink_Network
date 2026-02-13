-- Phase 12: Production Stability Upgrade

-- 1. Pair Codes Table
CREATE TABLE IF NOT EXISTS pair_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- or SERIAL for PG, universal DB handles this? SQLite uses AUTOINCREMENT
    code TEXT UNIQUE NOT NULL,
    wallet TEXT,
    status TEXT DEFAULT 'pending', -- pending | used | expired
    device_id TEXT,
    created_at INTEGER,
    expires_at INTEGER
);

-- 2. Nodes Table (Refined from registered_nodes)
-- We will keep registered_nodes for backward compatibility if needed, 
-- but ideally we migrate or ensure 'nodes' is the new source of truth.
-- For now, let's create 'nodes' as requested.
CREATE TABLE IF NOT EXISTS nodes (
    node_id TEXT PRIMARY KEY, -- device_id or generated UUID
    wallet TEXT,
    device_type TEXT DEFAULT 'undefined', -- android | docker | nodeops
    status TEXT DEFAULT 'pending', -- pending | active | offline
    last_seen INTEGER,
    created_at INTEGER
);

-- 3. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_wallet TEXT,
    action_type TEXT NOT NULL,
    target_id TEXT,
    metadata TEXT, -- JSON string
    created_at INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pair_codes_status ON pair_codes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_wallet ON nodes(wallet);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_wallet);
