-- Phase P: Partner Webhooks
-- Stores webhook configurations and delivery attempts

CREATE TABLE IF NOT EXISTS partner_webhooks (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_hash TEXT NOT NULL, -- HMAC secret (hashed)
    events_json TEXT NOT NULL, -- ["op_completed", "op_failed"]
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY(partner_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
    id TEXT PRIMARY KEY,
    webhook_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, success, failed, retrying
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at INTEGER,
    next_retry_at INTEGER,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(webhook_id) REFERENCES partner_webhooks(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_pending 
ON webhook_delivery_attempts(status, next_retry_at);
