-- LAYER: INFRASTRUCTURE MARKETPLACE EXPANSION

CREATE TABLE IF NOT EXISTS marketplace_jobs (
    job_id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    reward REAL NOT NULL,
    payload TEXT NOT NULL,
    creator_wallet TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, scheduled, executing, completed, failed
    created_at BIGINT NOT NULL
);

-- Note: We rely on standard execution_metrics and op_counts to support aggregate metrics tracking, 
-- but will append a specific marketplace stats table for speed resolving dashboard endpoints.
CREATE TABLE IF NOT EXISTS marketplace_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jobs_submitted INTEGER DEFAULT 0,
    jobs_executed INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0,
    updated_at BIGINT
);

-- Seed row
INSERT OR IGNORE INTO marketplace_metrics (id, updated_at) VALUES (1, strftime('%s', 'now') * 1000);
