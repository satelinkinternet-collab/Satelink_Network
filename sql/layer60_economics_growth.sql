-- Phase M: Real Revenue & Growth Analytics

-- M1: Per-Node Break-Even Tracking
CREATE TABLE IF NOT EXISTS node_cost_overrides (
    node_id TEXT PRIMARY KEY,
    cost_usdt_day REAL NOT NULL,
    updated_by TEXT,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS node_econ_daily (
    day_yyyymmdd INTEGER,
    node_id TEXT,
    revenue_usdt REAL,
    rewards_usdt REAL,
    cost_usdt REAL,
    net_usdt REAL,
    margin_pct REAL,
    created_at INTEGER,
    PRIMARY KEY (day_yyyymmdd, node_id)
);

-- M2: Retention Dashboard
CREATE TABLE IF NOT EXISTS retention_daily (
    day_yyyymmdd INTEGER,
    cohort_type TEXT, -- user, node, partner, distributor
    cohort_day_yyyymmdd INTEGER,
    cohort_size INTEGER,
    active_count INTEGER,
    retention_rate REAL, -- 0.0 to 1.0
    created_at INTEGER,
    PRIMARY KEY (day_yyyymmdd, cohort_type, cohort_day_yyyymmdd)
);

-- M3: Usage Authenticity (Anti-Fake Growth)
CREATE TABLE IF NOT EXISTS usage_authenticity_daily (
    day_yyyymmdd INTEGER PRIMARY KEY,
    total_ops INTEGER,
    ops_unique_clients INTEGER,
    ops_unique_wallets INTEGER,
    ops_from_test_keys INTEGER,
    ops_replay_suspected INTEGER,
    duplicate_request_id_rate REAL,
    op_entropy_score REAL,
    authenticity_score REAL, -- 0-100
    created_at INTEGER
);

-- M4: Revenue Stability Index
CREATE TABLE IF NOT EXISTS revenue_stability_daily (
    day_yyyymmdd INTEGER PRIMARY KEY,
    revenue_usdt REAL,
    revenue_volatility_7d REAL,
    client_concentration REAL,
    region_concentration REAL,
    surge_dependency REAL,
    node_distribution_fairness REAL,
    stability_score REAL, -- 0-100
    created_at INTEGER
);

-- M5: Node Density Strategy
CREATE TABLE IF NOT EXISTS region_density_daily (
    day_yyyymmdd INTEGER,
    region_code TEXT,
    active_nodes INTEGER,
    ops_total INTEGER,
    revenue_usdt REAL,
    ops_per_node REAL,
    revenue_per_node REAL,
    node_to_ops_ratio REAL,
    created_at INTEGER,
    PRIMARY KEY (day_yyyymmdd, region_code)
);
