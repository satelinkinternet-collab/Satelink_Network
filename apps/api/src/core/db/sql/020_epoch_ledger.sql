-- 020_epoch_ledger.sql
-- Creates epoch_ledger table for revenue tracking
-- Required by: metrics.js, epoch aggregation

CREATE TABLE IF NOT EXISTS epoch_ledger (
    id SERIAL PRIMARY KEY,
    epoch_id INTEGER UNIQUE,
    status TEXT NOT NULL DEFAULT 'OPEN',
    started_at BIGINT NOT NULL,
    closed_at BIGINT,
    total_revenue NUMERIC(18,8) DEFAULT 0,
    node_pool NUMERIC(18,8) DEFAULT 0,
    platform_fee NUMERIC(18,8) DEFAULT 0,
    distribution_pool NUMERIC(18,8) DEFAULT 0,
    merkle_root TEXT,
    tx_hash TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_epoch_ledger_status ON epoch_ledger (status);
CREATE INDEX IF NOT EXISTS idx_epoch_ledger_epoch_id ON epoch_ledger (epoch_id);

-- Insert initial open epoch if none exists
INSERT INTO epoch_ledger (epoch_id, status, started_at, total_revenue)
SELECT 1, 'OPEN', EXTRACT(EPOCH FROM NOW()), 0
WHERE NOT EXISTS (SELECT 1 FROM epoch_ledger WHERE status = 'OPEN');
