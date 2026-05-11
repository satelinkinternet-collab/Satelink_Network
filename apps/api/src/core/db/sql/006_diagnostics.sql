-- 006_diagnostics.sql — Observability and Diagnostics

CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    ts INTEGER NOT NULL,
    level TEXT NOT NULL, -- 'error', 'warn', 'info'
    source TEXT NOT NULL, -- 'server', 'webhook', 'distribution'
    route TEXT,
    message TEXT,
    meta_json TEXT -- JSON object with stack, request_id, etc.
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    ts INTEGER NOT NULL,
    provider TEXT NOT NULL,
    event_id TEXT,
    status TEXT NOT NULL, -- 'applied', 'rejected', 'failed'
    amount_usdt REAL DEFAULT 0,
    payer_wallet TEXT,
    source_type TEXT
);

CREATE TABLE IF NOT EXISTS diag_share_tokens (
    token TEXT PRIMARY KEY,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_logs_ts ON error_logs(ts);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_ts ON webhook_logs(ts);
