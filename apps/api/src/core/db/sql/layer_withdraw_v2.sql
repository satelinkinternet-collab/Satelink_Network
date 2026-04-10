-- layer_withdraw_v2.sql
-- Production-grade withdrawals table with idempotency, user binding, and audit fields.
-- Replaces the minimal withdrawals schema from 003_balances_claims_withdrawals.sql.

CREATE TABLE IF NOT EXISTS withdrawals_v2 (
    id TEXT PRIMARY KEY,                          -- UUID
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',        -- PENDING, PROCESSING, PAID, FAILED
    tx_hash TEXT,
    request_id TEXT NOT NULL UNIQUE,               -- idempotency key
    failure_reason TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_user ON withdrawals_v2 (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_status ON withdrawals_v2 (status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_wallet ON withdrawals_v2 (wallet_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_created ON withdrawals_v2 (created_at);
