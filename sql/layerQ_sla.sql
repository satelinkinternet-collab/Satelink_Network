-- ============================================================
-- Phase Q: Enterprise SLA + Multi-tenant Reliability
-- ============================================================

-- Q1: SLA Plans
CREATE TABLE IF NOT EXISTS sla_plans (
    id TEXT PRIMARY KEY,               -- free | starter | pro | enterprise
    name TEXT NOT NULL,
    target_success_rate REAL NOT NULL,  -- e.g. 0.98, 0.995, 0.999
    target_p95_latency_ms INTEGER NOT NULL,
    monthly_fee_usdt REAL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- Q1: Tenant Limits
CREATE TABLE IF NOT EXISTS tenant_limits (
    partner_id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL DEFAULT 'free',
    max_rps INTEGER NOT NULL DEFAULT 10,
    max_daily_ops INTEGER NOT NULL DEFAULT 1000,
    max_daily_spend_usdt REAL NOT NULL DEFAULT 50.0,
    allowed_op_types_json TEXT DEFAULT '["*"]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY(partner_id) REFERENCES partner_registry(partner_id),
    FOREIGN KEY(plan_id) REFERENCES sla_plans(id)
);

-- Q2: Daily SLA Cache
CREATE TABLE IF NOT EXISTS tenant_sla_daily (
    day_yyyymmdd TEXT NOT NULL,
    partner_id TEXT NOT NULL,
    total_ops INTEGER DEFAULT 0,
    failed_ops INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 1.0,
    p95_latency_ms REAL DEFAULT 0,
    budget_remaining_pct REAL DEFAULT 100.0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(day_yyyymmdd, partner_id)
);

-- Q3: Per-Op-Type SLO Cache
CREATE TABLE IF NOT EXISTS tenant_op_slo_daily (
    day_yyyymmdd TEXT NOT NULL,
    partner_id TEXT NOT NULL,
    op_type TEXT NOT NULL,
    p95_latency_ms REAL DEFAULT 0,
    success_rate REAL DEFAULT 1.0,
    total_ops INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(day_yyyymmdd, partner_id, op_type)
);

-- Q4: Circuit Breaker State
CREATE TABLE IF NOT EXISTS tenant_circuit_state (
    partner_id TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'closed',   -- closed | open | half_open
    reason TEXT,
    tripped_at INTEGER,
    recovers_at INTEGER,
    ops_today INTEGER DEFAULT 0,
    spend_today_usdt REAL DEFAULT 0,
    last_reset_day TEXT,
    disabled_ops_json TEXT DEFAULT '[]'
);

-- Q5: SLA Reports
CREATE TABLE IF NOT EXISTS sla_reports (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    month_yyyymm TEXT NOT NULL,
    report_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sla_reports_partner_month
ON sla_reports(partner_id, month_yyyymm);

-- Q6: Simulated Credits
CREATE TABLE IF NOT EXISTS sla_credits (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'simulated', -- simulated | applied
    created_at INTEGER NOT NULL
);

-- ============================================================
-- Seed default SLA plans
-- ============================================================
INSERT INTO sla_plans (id, name, target_success_rate, target_p95_latency_ms, monthly_fee_usdt, created_at)
VALUES
    ('free',       'Free',       0.95,   2000, 0,     strftime('%s','now') * 1000),
    ('starter',    'Starter',    0.98,   1000, 49,    strftime('%s','now') * 1000),
    ('pro',        'Pro',        0.995,  500,  199,   strftime('%s','now') * 1000),
    ('enterprise', 'Enterprise', 0.999,  200,  999,   strftime('%s','now') * 1000)
ON CONFLICT(id) DO NOTHING;
