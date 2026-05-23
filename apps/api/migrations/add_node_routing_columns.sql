-- Migration: add node routing + circuit breaker columns
-- Safe to run on live DB — uses IF NOT EXISTS pattern
-- Created: 2026-05-24

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS total_requests_served BIGINT NOT NULL DEFAULT 0;

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS avg_latency_ms REAL DEFAULT NULL;

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS last_failure_at BIGINT DEFAULT NULL;

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS last_failure_reason TEXT DEFAULT NULL;

-- Index for fast dispatcher queries
CREATE INDEX IF NOT EXISTS idx_nodes_dispatch
  ON registered_nodes(status, node_type, last_heartbeat_at)
  WHERE status = 'active';

-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'registered_nodes'
  AND column_name IN ('consecutive_failures', 'total_requests_served', 'avg_latency_ms', 'last_failure_at', 'last_failure_reason')
ORDER BY column_name;
