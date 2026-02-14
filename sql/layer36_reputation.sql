-- ═══════════════════════════════════════════════════════════
-- Phase 36: Node Reputation + Quality Marketplace
-- ═══════════════════════════════════════════════════════════

-- 1. Node Reputation Scores
CREATE TABLE IF NOT EXISTS node_reputation (
    node_id TEXT PRIMARY KEY,
    uptime_score REAL DEFAULT 50.0,
    latency_score REAL DEFAULT 50.0,
    reliability_score REAL DEFAULT 50.0,
    fraud_penalty_score REAL DEFAULT 0.0,
    revenue_score REAL DEFAULT 50.0,
    composite_score REAL DEFAULT 50.0,
    tier TEXT NOT NULL DEFAULT 'bronze' CHECK(tier IN ('bronze','silver','gold','platinum')),
    last_updated_at INTEGER
);

-- 2. Reputation History (for sparklines)
CREATE TABLE IF NOT EXISTS reputation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    composite_score REAL NOT NULL,
    tier TEXT NOT NULL,
    recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rephist_node ON reputation_history(node_id, recorded_at);

-- 3. System flags
INSERT OR IGNORE INTO system_config (key, value) VALUES ('quality_routing_enabled', 'true');
INSERT OR IGNORE INTO system_config (key, value) VALUES ('reputation_multiplier_enabled', 'true');
