-- 003_balances_claims_withdrawals.sql
CREATE TABLE IF NOT EXISTS balances (
    wallet TEXT PRIMARY KEY,
    amount_usdt REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    wallet TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    wallet TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    tx_hash TEXT,
    created_at BIGINT NOT NULL
);
