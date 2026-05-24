-- create_node_claims.sql
-- PostgreSQL-compatible node claims table for operator withdrawals
-- Safe to run multiple times (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS node_claims (
    id BIGSERIAL PRIMARY KEY,
    claim_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    node_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount_usdt DECIMAL(18,6) NOT NULL,
    epoch_ids JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'confirmed', 'failed')),
    tx_hash TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    error_msg TEXT
);

CREATE INDEX IF NOT EXISTS idx_claims_node ON node_claims(node_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON node_claims(wallet_address, status);
CREATE INDEX IF NOT EXISTS idx_claims_status ON node_claims(status, requested_at);
