-- Stage 2: Node Execution Network tables

-- Node stats persisted from heartbeats
CREATE TABLE IF NOT EXISTS node_stats (
    wallet TEXT PRIMARY KEY,
    cpu REAL DEFAULT 0,
    memory REAL DEFAULT 0,
    uptime REAL DEFAULT 0,
    recorded_at INTEGER NOT NULL
);

-- Database-backed retry tracking (replaces in-memory retryMap)
CREATE TABLE IF NOT EXISTS job_retries (
    job_id TEXT PRIMARY KEY,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at INTEGER NOT NULL,
    last_node TEXT
);

-- Escrow lock tracking
CREATE TABLE IF NOT EXISTS escrow_locks (
    job_id TEXT PRIMARY KEY,
    developer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    locked_at INTEGER NOT NULL
);
