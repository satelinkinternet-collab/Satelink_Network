-- 024_credit_balances.sql
-- Autonomous payer: prepaid USDT credit system
-- wallet_address is the on-chain payer identity
-- balance_usdt is deducted per RPC call via credit_gate middleware

BEGIN;

CREATE TABLE IF NOT EXISTS credit_balances (
  id              SERIAL PRIMARY KEY,
  wallet_address  VARCHAR(42) NOT NULL,
  balance_usdt    NUMERIC(18, 6) NOT NULL DEFAULT 0 CHECK (balance_usdt >= 0),
  total_deposited NUMERIC(18, 6) NOT NULL DEFAULT 0,
  total_spent     NUMERIC(18, 6) NOT NULL DEFAULT 0,
  last_deposit_tx VARCHAR(66),
  last_deposit_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_balances_wallet_unique UNIQUE (wallet_address),
  CONSTRAINT credit_balances_wallet_format CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$')
);

CREATE INDEX IF NOT EXISTS idx_credit_balances_wallet
  ON credit_balances(lower(wallet_address));

CREATE TABLE IF NOT EXISTS credit_deposits (
  id             SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  amount_usdt    NUMERIC(18, 6) NOT NULL CHECK (amount_usdt > 0),
  tx_hash        VARCHAR(66) NOT NULL,
  block_number   BIGINT NOT NULL,
  chain_id       INTEGER NOT NULL DEFAULT 80002,
  confirmed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_deposits_tx_unique UNIQUE (tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_credit_deposits_wallet
  ON credit_deposits(lower(wallet_address));
CREATE INDEX IF NOT EXISTS idx_credit_deposits_tx
  ON credit_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_credit_deposits_block
  ON credit_deposits(block_number);

COMMIT;
