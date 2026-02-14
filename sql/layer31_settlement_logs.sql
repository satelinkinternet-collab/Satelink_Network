-- Phase 31: Settlement Logs

CREATE TABLE IF NOT EXISTS settlement_shadow_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT,
    primary_json TEXT,
    shadow_json TEXT,
    diff_json TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS settlement_health_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adapter_name TEXT,
    health_status TEXT, -- 'ok', 'degraded', 'down'
    latency_ms INTEGER,
    error_message TEXT,
    created_at INTEGER
);

-- Initial System Flags for Settlement
INSERT OR IGNORE INTO system_flags (key, value, updated_at) 
VALUES ('settlement_adapter', 'SIMULATED', strftime('%s','now')*1000);

INSERT OR IGNORE INTO system_flags (key, value, updated_at) 
VALUES ('settlement_dry_run', '0', strftime('%s','now')*1000);

INSERT OR IGNORE INTO system_flags (key, value, updated_at) 
VALUES ('settlement_shadow_mode', '0', strftime('%s','now')*1000);
