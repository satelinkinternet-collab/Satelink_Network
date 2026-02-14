-- ═══════════════════════════════════════════════════════════
-- Phase 37: Silent Embedded Wallet (Non-Custodial) Auth
-- ═══════════════════════════════════════════════════════════

-- 1. Users Table (Core identity)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_wallet TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    last_login_at INTEGER
);

-- 2. Auth Nonces (Signature verification anti-replay)
CREATE TABLE IF NOT EXISTS auth_nonces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_address ON auth_nonces(address);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_expiry ON auth_nonces(expires_at);

-- Seed an initial user if needed (optional, typically handled on first login)
