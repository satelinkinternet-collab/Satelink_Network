-- 001_core.sql — Satelink Go-Live Core Schema
-- Safe to rerun (CREATE TABLE IF NOT EXISTS)

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
    updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS epochs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_wallet TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    ip TEXT,
    created_at INTEGER NOT NULL
);
