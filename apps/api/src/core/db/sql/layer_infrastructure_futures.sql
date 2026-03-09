-- LAYER: INFRASTRUCTURE FUTURES MARKET EXPANSION

CREATE TABLE IF NOT EXISTS node_futures_contracts (
    contract_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    epoch_start INTEGER NOT NULL,
    epoch_end INTEGER NOT NULL,
    revenue_share REAL NOT NULL, -- e.g. 0.25 for 25%
    price REAL NOT NULL,
    buyer_wallet TEXT,
    status TEXT NOT NULL, -- listed, sold, settled, expired
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS futures_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contracts_listed INTEGER DEFAULT 0,
    contracts_sold INTEGER DEFAULT 0,
    future_revenue_locked REAL DEFAULT 0,
    investors_paid_out REAL DEFAULT 0,
    updated_at BIGINT
);

-- Seed row
INSERT OR IGNORE INTO futures_metrics (id, updated_at) VALUES (1, strftime('%s', 'now') * 1000);
