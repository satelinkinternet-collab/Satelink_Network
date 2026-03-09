-- LAYER: PROFITABILITY ENGINE & JOB SCHEDULER EXPANSION
-- Adds tables required for persistent queue backup, metrics, and pricing

CREATE TABLE IF NOT EXISTS job_queue_log (
    job_id TEXT PRIMARY KEY,
    chain TEXT,
    payload TEXT,
    priority TEXT,
    reward REAL,
    status TEXT, -- 'queued', 'processing', 'completed', 'rejected_unprofitable', 'failed'
    created_at BIGINT,
    completed_at BIGINT
);

CREATE TABLE IF NOT EXISTS workload_pricing (
    workload_type TEXT PRIMARY KEY,
    base_cost_usdt REAL NOT NULL,
    base_reward_usdt REAL NOT NULL,
    created_at BIGINT
);

-- Note: execution_metrics might already exist from previous stage (Part 5 Expansion). 
-- This safely adds it if not.
CREATE TABLE IF NOT EXISTS execution_metrics (
    source_id TEXT,
    source_type TEXT,
    chain TEXT,
    requests_handled INTEGER DEFAULT 0,
    updated_at BIGINT,
    UNIQUE(source_id, chain)
);
