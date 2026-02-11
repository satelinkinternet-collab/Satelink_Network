-- 007_day1_revenue.sql
-- Phase A & B: Paid Ops and Epoch Earnings

CREATE TABLE IF NOT EXISTS ops_pricing (
    op_type TEXT PRIMARY KEY,
    price_usdt REAL NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    max_per_minute_per_client INTEGER DEFAULT 100,
    max_per_minute_per_node INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS epoch_earnings (
    epoch_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'node_operator', 'platform', 'distribution_pool'
    wallet_or_node_id TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID', -- UNPAID, CLAIMED, PAID
    created_at INTEGER NOT NULL,
    PRIMARY KEY (epoch_id, role, wallet_or_node_id)
);

-- Ensure revenue_events has client_id and status for Phase A
-- SQLite doesn't support IF NOT EXISTS for columns, adding via separate app logic or simple alter
-- We'll assume the migration runner handles column additions via PRAGMA if needed, 
-- but here we'll define a robust schema for NEW setups.

CREATE TABLE IF NOT EXISTS revenue_events_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch_id INTEGER,
    op_type TEXT NOT NULL,
    node_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    request_id TEXT, -- idempotency key
    created_at INTEGER NOT NULL,
    metadata_hash TEXT,
    UNIQUE(client_id, op_type, request_id)
);

-- Seed initial pricing data
INSERT OR IGNORE INTO ops_pricing (op_type, price_usdt, enabled) VALUES ('api_relay_execution', 0.01, 1);
INSERT OR IGNORE INTO ops_pricing (op_type, price_usdt, enabled) VALUES ('automation_job_execute', 0.05, 1);
INSERT OR IGNORE INTO ops_pricing (op_type, price_usdt, enabled) VALUES ('network_health_oracle_update', 0.02, 1);
INSERT OR IGNORE INTO ops_pricing (op_type, price_usdt, enabled) VALUES ('routing_decision_compute', 0.001, 1);
INSERT OR IGNORE INTO ops_pricing (op_type, price_usdt, enabled) VALUES ('verification_op', 0.05, 1);
