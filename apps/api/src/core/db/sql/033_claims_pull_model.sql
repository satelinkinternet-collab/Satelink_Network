-- Claims Pull Model Migration
-- Adds EIP-712 signature support and 48-day expiry sweeping

-- Ensure claims table has pull model columns
DO $$
BEGIN
    -- Add claim_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'claim_id') THEN
        ALTER TABLE claims ADD COLUMN claim_id TEXT UNIQUE;
    END IF;

    -- Add signature column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'signature') THEN
        ALTER TABLE claims ADD COLUMN signature TEXT;
    END IF;

    -- Add nonce column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'nonce') THEN
        ALTER TABLE claims ADD COLUMN nonce BIGINT;
    END IF;

    -- Add expiry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'expiry') THEN
        ALTER TABLE claims ADD COLUMN expiry BIGINT;
    END IF;

    -- Add node_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'node_id') THEN
        ALTER TABLE claims ADD COLUMN node_id TEXT;
    END IF;

    -- Add wallet if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'wallet') THEN
        ALTER TABLE claims ADD COLUMN wallet TEXT;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'updated_at') THEN
        ALTER TABLE claims ADD COLUMN updated_at BIGINT;
    END IF;

    -- Add claimed_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'claims' AND column_name = 'claimed_at') THEN
        ALTER TABLE claims ADD COLUMN claimed_at BIGINT;
    END IF;

    -- Add expired_at to epoch_earnings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'epoch_earnings' AND column_name = 'expired_at') THEN
        ALTER TABLE epoch_earnings ADD COLUMN expired_at BIGINT;
    END IF;
END $$;

-- Treasury sweeps table for tracking expired rewards
CREATE TABLE IF NOT EXISTS treasury_sweeps (
    id SERIAL PRIMARY KEY,
    node_id TEXT,
    amount_usdt NUMERIC(18,8) NOT NULL,
    reason TEXT NOT NULL DEFAULT '48_day_expiry',
    swept_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for claims
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON claims(wallet);
CREATE INDEX IF NOT EXISTS idx_claims_node_id ON claims(node_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_expiry ON claims(expiry);

-- Indexes for treasury sweeps
CREATE INDEX IF NOT EXISTS idx_treasury_sweeps_node_id ON treasury_sweeps(node_id);
CREATE INDEX IF NOT EXISTS idx_treasury_sweeps_swept_at ON treasury_sweeps(swept_at);

-- Indexes for epoch_earnings expiry
CREATE INDEX IF NOT EXISTS idx_epoch_earnings_expired_at ON epoch_earnings(expired_at);
