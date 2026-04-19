-- ═══════════════════════════════════════════════════════════
-- Phase 37.1 (H4): Support Diagnostics
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    wallet TEXT NOT NULL,
    message TEXT NOT NULL,
    bundle_json TEXT NOT NULL, -- The sanitized diagnostic bundle
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'ignored'
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_wallet ON support_tickets(wallet);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
