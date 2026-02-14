-- Phase J1: UI Language Mode (SIMPLE vs ADVANCED)
CREATE TABLE IF NOT EXISTS user_settings (
    wallet TEXT PRIMARY KEY,
    ui_mode TEXT DEFAULT 'SIMPLE', -- 'SIMPLE', 'ADVANCED'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Phase J2: Address Masking + Human IDs
CREATE TABLE IF NOT EXISTS public_identity (
    wallet TEXT PRIMARY KEY,
    public_id TEXT NOT NULL, -- "SLK-XXXX-XXXX"
    created_at INTEGER NOT NULL,
    UNIQUE(public_id)
);

CREATE INDEX IF NOT EXISTS idx_public_identity_id ON public_identity(public_id);

-- Phase J5: Guided Onboarding
CREATE TABLE IF NOT EXISTS onboarding_state (
    wallet TEXT PRIMARY KEY,
    step_completed_json TEXT DEFAULT '{}',
    completed_at INTEGER
);
