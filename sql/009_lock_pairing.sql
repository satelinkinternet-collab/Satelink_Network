-- Phase 13: strict pairing schema

DROP TABLE IF EXISTS pair_codes;

CREATE TABLE pair_codes (
    code TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | used | expired
    device_id TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pair_codes_wallet ON pair_codes(wallet);
CREATE INDEX IF NOT EXISTS idx_pair_codes_status ON pair_codes(status);
