-- Phase 34: Revenue Generation & Growth

-- 1. Pricing Rules
-- Defines how much an operation costs (base + dynamic factors)
CREATE TABLE IF NOT EXISTS pricing_rules (
    op_type TEXT PRIMARY KEY, -- e.g. 'inference', 'storage', 'bandwidth'
    base_price_usdt DECIMAL(20, 8) NOT NULL,
    surge_enabled BOOLEAN DEFAULT 0,
    surge_threshold INTEGER DEFAULT 1000, -- ops/minute
    surge_multiplier DECIMAL(5, 2) DEFAULT 1.0,
    version INTEGER DEFAULT 1,
    updated_at INTEGER
);

-- Initial seed data
INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('inference', 0.0001, 1700000000);
INSERT OR IGNORE INTO pricing_rules (op_type, base_price_usdt, updated_at) VALUES ('storage_gb_hr', 0.00005, 1700000000);

-- 2. Node Profitability Daily Snapshot
CREATE TABLE IF NOT EXISTS node_profitability_daily (
    date_key TEXT NOT NULL, -- YYYY-MM-DD
    node_id TEXT NOT NULL,
    revenue_generated DECIMAL(20, 8) DEFAULT 0,
    rewards_earned DECIMAL(20, 8) DEFAULT 0,
    uptime_seconds INTEGER DEFAULT 0,
    op_count INTEGER DEFAULT 0,
    infra_cost_est DECIMAL(20, 8) DEFAULT 0,
    PRIMARY KEY (date_key, node_id)
);

-- 3. Distributor Commissions
CREATE TABLE IF NOT EXISTS distributor_commissions (
    id TEXT PRIMARY KEY, -- uuid
    distributor_wallet TEXT NOT NULL,
    source_event_id TEXT, -- e.g. settlement_batch_id or acquisition_id
    amount_usdt DECIMAL(20, 8) NOT NULL,
    status TEXT DEFAULT 'accrued', -- accrued, paid, cancelled
    fraud_flag BOOLEAN DEFAULT 0,
    created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_commissions_wallet ON distributor_commissions(distributor_wallet);

-- 4. Node Acquisition Log
CREATE TABLE IF NOT EXISTS node_acquisition_log (
    node_id TEXT PRIMARY KEY,
    distributor_wallet TEXT,
    campaign_tag TEXT,
    acquisition_cost_est DECIMAL(20, 8),
    activated_at INTEGER
);

-- 5. Unit Economics Daily Aggregates
CREATE TABLE IF NOT EXISTS unit_economics_daily (
    date_key TEXT PRIMARY KEY, -- YYYY-MM-DD
    total_revenue DECIMAL(20, 8) DEFAULT 0,
    total_rewards DECIMAL(20, 8) DEFAULT 0,
    total_nodes_active INTEGER DEFAULT 0,
    burn_rate DECIMAL(20, 8) DEFAULT 0,
    avg_margin_percent DECIMAL(10, 2) DEFAULT 0,
    created_at INTEGER
);

-- 6. Phase 34 Hardening: Extend revenue_events_v2 with billing detail columns
-- SQLite ALTER TABLE only supports ADD COLUMN, safe to repeat with IF NOT EXISTS workaround
-- Using CREATE TABLE IF NOT EXISTS trick: columns added via migration runner's safeAlter
-- The migrate.js runner wraps ALTER in try/catch, so duplicates are harmless.

-- revenue_events_v2 extensions
ALTER TABLE revenue_events_v2 ADD COLUMN price_version INTEGER DEFAULT 1;
ALTER TABLE revenue_events_v2 ADD COLUMN surge_multiplier REAL DEFAULT 1.0;
ALTER TABLE revenue_events_v2 ADD COLUMN unit_cost REAL DEFAULT 0;
ALTER TABLE revenue_events_v2 ADD COLUMN unit_count INTEGER DEFAULT 1;

-- distributor_commissions extensions
ALTER TABLE distributor_commissions ADD COLUMN commission_rate REAL DEFAULT 0.05;
ALTER TABLE distributor_commissions ADD COLUMN daily_cap REAL DEFAULT 50.0;
ALTER TABLE distributor_commissions ADD COLUMN fraud_score REAL DEFAULT 0;

-- node_profitability_daily extensions
ALTER TABLE node_profitability_daily ADD COLUMN uptime_pct REAL DEFAULT 0;
ALTER TABLE node_profitability_daily ADD COLUMN success_rate REAL DEFAULT 0;
ALTER TABLE node_profitability_daily ADD COLUMN avg_latency_ms REAL DEFAULT 0;
ALTER TABLE node_profitability_daily ADD COLUMN rank INTEGER DEFAULT 0;
ALTER TABLE node_profitability_daily ADD COLUMN net_profit REAL DEFAULT 0;
