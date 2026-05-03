-- 014_claims.sql — Claims table for node operator USDT withdrawals

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    node_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    amount_usdt NUMERIC(18,8) NOT NULL,
    tx_hash TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    claimed_at BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claims_node_id ON claims(node_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON claims(wallet);
