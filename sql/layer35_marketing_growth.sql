-- ═══════════════════════════════════════════════════════════
-- Phase 35: Marketing Expansion + Partnership Onboarding
-- ═══════════════════════════════════════════════════════════

-- 1. Region Activation Control
CREATE TABLE IF NOT EXISTS region_activation (
    region_code TEXT PRIMARY KEY,
    region_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'inactive' CHECK(status IN ('inactive','pilot','active','paused')),
    node_cap INTEGER DEFAULT 50,
    active_nodes_count INTEGER DEFAULT 0,
    revenue_cap_usdt_daily REAL DEFAULT 100.0,
    rewards_cap_usdt_daily REAL DEFAULT 50.0,
    created_at INTEGER,
    updated_at INTEGER
);

-- Seed initial global region
INSERT OR IGNORE INTO region_activation (region_code, region_name, status, node_cap, created_at, updated_at)
VALUES ('GLOBAL', 'Global (Default)', 'active', 10000, strftime('%s','now')*1000, strftime('%s','now')*1000);

-- 2. Partner Registry
CREATE TABLE IF NOT EXISTS partner_registry (
    partner_id TEXT PRIMARY KEY,
    partner_name TEXT NOT NULL DEFAULT '',
    wallet TEXT,
    api_key_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
    rate_limit_per_min INTEGER DEFAULT 60,
    revenue_share_percent REAL DEFAULT 10.0,
    total_revenue REAL DEFAULT 0,
    total_ops INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

-- 3. Distributor extensions for tiered referrals
ALTER TABLE distributor_commissions ADD COLUMN tier_level INTEGER DEFAULT 1;
ALTER TABLE distributor_commissions ADD COLUMN referral_depth INTEGER DEFAULT 0;
ALTER TABLE distributor_commissions ADD COLUMN decay_days INTEGER DEFAULT 90;
ALTER TABLE distributor_commissions ADD COLUMN parent_referrer TEXT DEFAULT NULL;
