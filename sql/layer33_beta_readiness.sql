-- Phase 33: Beta Launch Readiness

CREATE TABLE IF NOT EXISTS weekly_network_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start INTEGER NOT NULL,     -- Timestamp of week start
    active_nodes_avg INTEGER,
    offline_events INTEGER,
    incidents_count INTEGER,
    top_error_stacks_json TEXT,      -- JSON array
    top_slow_queries_json TEXT,      -- JSON array
    rewards_distributed TEXT,        -- Amount string or JSON details
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_start ON weekly_network_reports(week_start);
