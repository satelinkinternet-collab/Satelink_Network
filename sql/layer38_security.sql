-- Phase I1: Sensitive Action Re-Auth
CREATE TABLE IF NOT EXISTS reauth_tokens (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    scope TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reauth_wallet ON reauth_tokens(wallet);

-- Phase I3: Device Trust List
CREATE TABLE IF NOT EXISTS trusted_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    device_public_id TEXT NOT NULL,
    label TEXT,
    user_agent TEXT,
    ip_hash TEXT,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, revoked
    UNIQUE(wallet, device_public_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_wallet ON trusted_devices(wallet);

-- Phase I5: Security Events (Extension to existing or new)
-- We can reuse admin_audit_log for high-level events, but specialized auth logs might be better if volume is high.
-- For now, we will log to admin_audit_log with target_type='auth_security'
