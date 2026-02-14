-- Phase K: Production Hardening

-- K2: Runtime Metrics
CREATE TABLE IF NOT EXISTS runtime_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    heap_used_mb REAL,
    rss_mb REAL,
    event_loop_lag_ms REAL,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_runtime_created ON runtime_metrics(created_at);

-- K6: Backup Verification Log (Extension to backup_log if needed, but we can reuse)
-- Ensure backup_log exists (it's in backup_service.js init, but let's be safe)
CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    size_bytes INTEGER,
    checksum TEXT,
    duration_ms INTEGER,
    status TEXT, -- 'success', 'failed'
    verified INTEGER DEFAULT 0, -- 0=false, 1=true
    verify_ts INTEGER,
    created_at INTEGER
);

-- K7: Stress Test Runs
CREATE TABLE IF NOT EXISTS stress_test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'load_10k', 'auth_storm'
    params_json TEXT,
    results_json TEXT, -- avg_latency, errors, etc
    duration_ms INTEGER,
    created_at INTEGER
);
