-- LAYER: WORKLOAD DISCOVERY ENGINE EXPANSION
-- Adds tables required for persistent workload discovery registry

CREATE TABLE IF NOT EXISTS workload_registry (
    workload_id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    market_source TEXT NOT NULL,
    reward_estimate REAL NOT NULL,
    status TEXT NOT NULL, -- queued, discarded_unprofitable, failed_enqueue
    created_at BIGINT NOT NULL
);

-- Note: metrics tracking is achieved by altering execution_metrics or summing workload_registry
