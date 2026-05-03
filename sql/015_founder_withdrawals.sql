-- 015_founder_withdrawals.sql — Founder withdrawal tracking

CREATE TABLE IF NOT EXISTS founder_withdrawals (
    id SERIAL PRIMARY KEY,
    founder_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    amount_usdt NUMERIC(18,8) NOT NULL,
    tx_hash TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    completed_at BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_founder_withdrawals_founder ON founder_withdrawals(founder_id);
CREATE INDEX IF NOT EXISTS idx_founder_withdrawals_status ON founder_withdrawals(status);
