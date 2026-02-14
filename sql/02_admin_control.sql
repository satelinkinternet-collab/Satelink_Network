-- Admin Control Room - Monitoring Schema

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_wallet TEXT,
    action_type TEXT,
    target_type TEXT,
    target_id TEXT,
    before_json TEXT, -- snapshot of state before change
    after_json TEXT,  -- snapshot of state after change
    ip_hash TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS system_flags (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_by TEXT,
    updated_at INTEGER
);

-- Seed System Flags
INSERT OR IGNORE INTO system_flags (key, value, updated_by, updated_at) VALUES ('withdrawals_paused', '0', 'system', strftime('%s','now'));
INSERT OR IGNORE INTO system_flags (key, value, updated_by, updated_at) VALUES ('security_freeze', '0', 'system', strftime('%s','now'));
INSERT OR IGNORE INTO system_flags (key, value, updated_by, updated_at) VALUES ('revenue_mode', 'ACTIVE', 'system', strftime('%s','now'));

CREATE TABLE IF NOT EXISTS error_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT,        -- api/web/worker
    route TEXT,
    method TEXT,
    status_code INTEGER,
    error_code TEXT,
    message TEXT,
    stack_hash TEXT,     -- for grouping similar errors
    stack_preview TEXT,  -- first few lines (redacted)
    trace_id TEXT,
    request_id TEXT,
    client_id TEXT,
    node_id TEXT,
    count INTEGER DEFAULT 1,
    first_seen_at INTEGER,
    last_seen_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_error_events_stack_hash ON error_events(stack_hash);
CREATE INDEX IF NOT EXISTS idx_error_events_last_seen ON error_events(last_seen_at);

CREATE TABLE IF NOT EXISTS request_traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT UNIQUE,
    request_id TEXT,
    route TEXT,
    method TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    client_id TEXT,
    node_id TEXT,
    ip_hash TEXT,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_request_traces_trace_id ON request_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_request_traces_created_at ON request_traces(created_at);

CREATE TABLE IF NOT EXISTS slow_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT,
    avg_ms REAL,
    p95_ms REAL,
    count INTEGER DEFAULT 1,
    last_seen_at INTEGER,
    sample_sql TEXT,     -- redacted SQL
    source TEXT,         -- e.g. sqlite
    trace_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_slow_queries_hash ON slow_queries(query_hash);

CREATE TABLE IF NOT EXISTS security_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    severity TEXT,       -- low/med/high/critical
    category TEXT,       -- abuse/fraud/auth/integrity/infra
    entity_type TEXT,    -- node/builder/distributor/system
    entity_id TEXT,
    title TEXT,
    evidence_json TEXT,
    status TEXT DEFAULT 'open', -- open/triaged/closed
    assigned_to TEXT,
    created_at INTEGER,
    resolved_by TEXT,
    resolved_at INTEGER,
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

CREATE TABLE IF NOT EXISTS config_limits (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_by TEXT,
    updated_at INTEGER
);

-- Seed Config Limits
INSERT OR IGNORE INTO config_limits (key, value, updated_by, updated_at) VALUES ('max_ops_per_min_client', '60', 'system', strftime('%s','now'));
INSERT OR IGNORE INTO config_limits (key, value, updated_by, updated_at) VALUES ('max_ops_per_min_node', '120', 'system', strftime('%s','now'));
INSERT OR IGNORE INTO config_limits (key, value, updated_by, updated_at) VALUES ('min_withdraw_usdt', '5', 'system', strftime('%s','now'));
INSERT OR IGNORE INTO config_limits (key, value, updated_by, updated_at) VALUES ('max_withdraw_usdt_day', '500', 'system', strftime('%s','now'));
