-- 004_epoch_distribution.sql
CREATE TABLE IF NOT EXISTS node_uptime (
    node_wallet TEXT NOT NULL,
    epoch_id INTEGER NOT NULL,
    uptime_seconds INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    PRIMARY KEY (node_wallet, epoch_id)
);

CREATE TABLE IF NOT EXISTS node_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch_id INTEGER NOT NULL,
    node_wallet TEXT NOT NULL,
    node_class TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT DEFAULT 'UNCLAIMED',
    created_at INTEGER NOT NULL,
    UNIQUE(epoch_id, node_wallet)
);

CREATE TABLE IF NOT EXISTS distribution_runs (
    epoch_id INTEGER PRIMARY KEY,
    total_revenue REAL,
    platform_fee REAL,
    node_pool REAL,
    created_at INTEGER NOT NULL
);

-- Legacy compat tables
CREATE TABLE IF NOT EXISTS reward_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch_id INTEGER NOT NULL,
    node_wallet TEXT NOT NULL,
    amount REAL NOT NULL,
    split_type TEXT DEFAULT 'NODE_POOL',
    finalized_at INTEGER NOT NULL,
    UNIQUE(epoch_id, node_wallet, split_type)
);

CREATE TABLE IF NOT EXISTS payout_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ledger_id INTEGER NOT NULL,
    node_wallet TEXT NOT NULL,
    amount REAL NOT NULL,
    withdrawn_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    claim_id TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
