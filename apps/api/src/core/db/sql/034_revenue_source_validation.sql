-- 034_revenue_source_validation.sql
-- Adds test/production segregation to revenue_events_v2
-- Prevents synthetic/test revenue from inflating real epoch earnings

ALTER TABLE revenue_events_v2
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE revenue_events_v2
  ADD COLUMN IF NOT EXISTS source_validated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_revenue_events_is_test
  ON revenue_events_v2(is_test_data, epoch_id);

COMMENT ON COLUMN revenue_events_v2.is_test_data IS
  'TRUE = synthetic or test revenue. Excluded from epoch earnings calculation.';

COMMENT ON COLUMN revenue_events_v2.source_validated IS
  'TRUE = revenue event verified from actual RPC/workload activity.';
