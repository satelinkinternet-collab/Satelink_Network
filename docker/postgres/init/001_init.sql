-- =============================================================
-- Satelink Postgres Bootstrap — run once on first db-init
-- Translated from sql/*.sql (SQLite → Postgres compatible)
-- =============================================================

-- ── 001_core ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS registered_nodes (
    wallet TEXT PRIMARY KEY,
    node_type TEXT DEFAULT 'edge',
    active INTEGER DEFAULT 1,
    is_flagged INTEGER DEFAULT 0,
    last_heartbeat INTEGER,
    last_nonce INTEGER DEFAULT 0,
    infra_reserved REAL DEFAULT 0,
    "updatedAt" INTEGER,
    latency INTEGER DEFAULT 0,
    bandwidth REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS epochs (
    id SERIAL PRIMARY KEY,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER,
    status TEXT DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS op_weights (
    op_type TEXT PRIMARY KEY,
    weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS op_counts (
    epoch_id INTEGER NOT NULL,
    user_wallet TEXT NOT NULL,
    op_type TEXT NOT NULL,
    ops REAL DEFAULT 0,
    weight REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (epoch_id, user_wallet, op_type)
);

CREATE TABLE IF NOT EXISTS rate_limits (
    node_wallet TEXT NOT NULL,
    op_type TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (node_wallet, op_type)
);

CREATE TABLE IF NOT EXISTS heartbeat_security_log (
    id SERIAL PRIMARY KEY,
    node_wallet TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_failures (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    ip TEXT,
    created_at INTEGER NOT NULL
);

-- ── 002_revenue ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments_inbox (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payload_json TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS revenue_events (
    id SERIAL PRIMARY KEY,
    amount REAL NOT NULL DEFAULT 0,
    amount_usdt REAL DEFAULT 0,
    token TEXT DEFAULT 'USDT',
    source TEXT DEFAULT 'UNKNOWN',
    source_type TEXT,
    provider TEXT,
    payer_wallet TEXT,
    reference TEXT,
    tx_ref TEXT,
    epoch_id INTEGER,
    on_chain_tx TEXT,
    created_at INTEGER NOT NULL
);

-- ── 008_production_upgrade (pair_codes + nodes + audit_logs) ──
CREATE TABLE IF NOT EXISTS pair_codes (
    code TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    device_id TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pair_codes_wallet  ON pair_codes(wallet);
CREATE INDEX IF NOT EXISTS idx_pair_codes_status  ON pair_codes(status);

CREATE TABLE IF NOT EXISTS nodes (
    node_id TEXT PRIMARY KEY,
    wallet TEXT,
    device_type TEXT DEFAULT 'undefined',
    status TEXT DEFAULT 'pending',
    last_seen INTEGER,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_nodes_wallet ON nodes(wallet);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_wallet TEXT,
    action_type TEXT NOT NULL,
    target_id TEXT,
    metadata TEXT,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_wallet);

-- ── layer37_auth (users + auth_nonces) ────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    primary_wallet TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS auth_nonces (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_address ON auth_nonces(address);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_expiry  ON auth_nonces(expires_at);

-- ── api_usage (referenced by dashboard endpoints) ─────────────
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    builder_wallet TEXT,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    latency_ms INTEGER,
    created_at INTEGER NOT NULL
);

-- ── error_events (referenced by global error handler) ─────────
CREATE TABLE IF NOT EXISTS error_events (
    id SERIAL PRIMARY KEY,
    service TEXT,
    route TEXT,
    method TEXT,
    status_code INTEGER,
    message TEXT,
    stack_hash TEXT,
    stack_preview TEXT,
    trace_id TEXT,
    request_id TEXT,
    client_id TEXT,
    count INTEGER DEFAULT 1,
    first_seen_at INTEGER,
    last_seen_at INTEGER
);

-- ── conversions (referenced by dev_auth_tokens.js) ────────────
CREATE TABLE IF NOT EXISTS conversions (
    id SERIAL PRIMARY KEY,
    ref_code TEXT,
    wallet TEXT,
    role TEXT,
    created_at INTEGER
);
