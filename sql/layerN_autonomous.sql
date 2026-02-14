-- Phase N: Autonomous Ops Engine (Detailed Rollout)

-- 1. System Flags (Seed Defaults)
INSERT OR IGNORE INTO system_config (key, value) VALUES 
('autonomous_ops_enabled', '0'),
('auto_reward_enabled', '0'),
('auto_node_bonus_enabled', '0'),
('auto_surge_enabled', '0');

-- 2. Config Limits (Seed Defaults)
INSERT OR IGNORE INTO system_config (key, value) VALUES 
('burn_threshold_pct', '20'),                 -- if rewards exceed revenue by 20%
('reward_adjustment_step_pct', '10'),         -- reduce multiplier by 10%
('min_reward_multiplier', '0.50'),
('max_reward_multiplier', '1.20'),
('node_bonus_max_multiplier', '1.10'),
('node_bonus_default_duration_hours', '24'),
('surge_adjustment_step', '0.05'),
('surge_multiplier_min', '1.00'),
('surge_multiplier_max', '1.50');

-- 3. Tables

-- A) Ops Recommendations
-- Stores suggestions from the engine before they are acted upon.
CREATE TABLE IF NOT EXISTS ops_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                     -- region_cap | reward_adjust | surge_tune | node_bonus | churn_prevent
    entity_type TEXT,                       -- region | system | node | op_type
    entity_id TEXT,
    recommendation_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected | expired | executed
    created_at INTEGER NOT NULL,
    decided_by TEXT,
    decided_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ops_rec_type ON ops_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_ops_rec_status ON ops_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ops_rec_created ON ops_recommendations(created_at);

-- B) Auto Actions Log
-- Immutable audit log of every autonomous action taken.
CREATE TABLE IF NOT EXISTS auto_actions_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,              -- reward_adjust | node_bonus | surge_tune
    before_json TEXT NOT NULL,
    after_json TEXT NOT NULL,
    reason TEXT,
    executed_by TEXT NOT NULL DEFAULT 'system',
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_log_type ON auto_actions_log(action_type, created_at);

-- C) Node Bonus Flags
-- Temporary multipliers for specific nodes.
CREATE TABLE IF NOT EXISTS node_bonus_flags (
    node_id TEXT PRIMARY KEY,
    multiplier REAL NOT NULL,
    expires_at INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
);

-- D) Churn Risk Flags
-- Tracking nodes at risk of leaving.
CREATE TABLE IF NOT EXISTS churn_risk_flags (
    node_id TEXT PRIMARY KEY,
    risk_score REAL NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
