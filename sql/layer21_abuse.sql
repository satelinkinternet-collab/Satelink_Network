-- Phase 21: Enhanced Abuse Firewall Schema

-- 21.1 A: Enforcement Events (Enhanced)
CREATE TABLE IF NOT EXISTS enforcement_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL, -- 'wallet', 'client', 'node', 'ip_hash', 'route'
    entity_id TEXT NOT NULL,
    decision TEXT NOT NULL, -- 'allow', 'throttle', 'block', 'challenge'
    reason_codes_json TEXT NOT NULL, 
    scope_json TEXT, -- {route, op_type}
    ttl_seconds INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'system',
    incident_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_enforcement_lookup ON enforcement_events(entity_type, entity_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_enforcement_created ON enforcement_events(created_at);

-- 21.1 B: Abuse Counters (5m Rolling Window)
CREATE TABLE IF NOT EXISTS abuse_counters_5m (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    window_start INTEGER NOT NULL,
    key_type TEXT NOT NULL, -- 'ip_hash', 'wallet', 'client_id', 'node_id'
    key_value TEXT NOT NULL,
    metric TEXT NOT NULL, -- 'req', 'auth_fail', 'rl_hit', 'op_fail', 'op_total'
    count INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    UNIQUE(window_start, key_type, key_value, metric)
);

CREATE INDEX IF NOT EXISTS idx_abuse_window ON abuse_counters_5m(window_start);
CREATE INDEX IF NOT EXISTS idx_abuse_lookup ON abuse_counters_5m(key_type, key_value);

-- 21.1 C: System Flags (Ensure keys exist)
INSERT OR IGNORE INTO system_flags (key, value, updated_at) VALUES ('safe_mode_enabled', '0', strftime('%s','now')*1000);
INSERT OR IGNORE INTO system_flags (key, value, updated_at) VALUES ('safe_mode_reason', '', strftime('%s','now')*1000);
INSERT OR IGNORE INTO system_flags (key, value, updated_at) VALUES ('safe_mode_until', '0', strftime('%s','now')*1000);
