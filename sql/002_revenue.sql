-- 002_revenue.sql — Revenue Tracking
CREATE TABLE IF NOT EXISTS payments_inbox (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payload_json TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS revenue_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
