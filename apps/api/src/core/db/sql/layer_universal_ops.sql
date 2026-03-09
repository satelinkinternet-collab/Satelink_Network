-- LAYER: UNIVERSAL OPS MARKETPLACE EXPANSION

CREATE TABLE IF NOT EXISTS ops_registry (
    op_id TEXT PRIMARY KEY,
    op_type TEXT NOT NULL,
    target TEXT,
    payload TEXT NOT NULL,
    reward REAL NOT NULL,
    status TEXT NOT NULL, -- pending, scheduled, executing, completed, failed
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS universal_ops_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operations_received INTEGER DEFAULT 0,
    operations_executed INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0,
    updated_at BIGINT
);

-- Seed row
INSERT OR IGNORE INTO universal_ops_metrics (id, updated_at) VALUES (1, strftime('%s', 'now') * 1000);
