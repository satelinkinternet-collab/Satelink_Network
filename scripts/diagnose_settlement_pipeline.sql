-- Settlement Pipeline Diagnostic Queries
-- Run these queries against production PostgreSQL to trace where value stops flowing
-- DO NOT execute any UPDATE/INSERT/DELETE statements

-- ============================================================================
-- STEP 1: revenue_events_v2 — Source of all metered revenue
-- ============================================================================
SELECT 'STEP 1: revenue_events_v2' as step;

SELECT
  COUNT(*) as total_events,
  COUNT(CASE WHEN is_test_data = false OR is_test_data IS NULL THEN 1 END) as real_events,
  SUM(CASE WHEN is_test_data = false OR is_test_data IS NULL THEN amount_usdt ELSE 0 END) as metered_usdt,
  COUNT(DISTINCT epoch_id) as epochs_with_events,
  COUNT(CASE WHEN epoch_id IS NULL THEN 1 END) as unassigned_events,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM revenue_events_v2;

-- Events by epoch assignment
SELECT
  COALESCE(epoch_id::text, 'UNASSIGNED') as epoch,
  COUNT(*) as event_count,
  SUM(amount_usdt) as sum_usdt
FROM revenue_events_v2
WHERE is_test_data = false OR is_test_data IS NULL
GROUP BY epoch_id
ORDER BY epoch_id DESC NULLS FIRST
LIMIT 10;

-- ============================================================================
-- STEP 2: epoch_ledger — Epoch aggregation status
-- ============================================================================
SELECT 'STEP 2: epoch_ledger' as step;

SELECT
  status,
  COUNT(*) as count,
  SUM(total_revenue) as sum_total_revenue,
  SUM(node_pool) as sum_node_pool,
  SUM(platform_fee) as sum_platform_fee
FROM epoch_ledger
GROUP BY status;

-- Most recent epochs
SELECT
  id,
  epoch_id,
  status,
  total_revenue,
  node_pool,
  platform_fee,
  started_at,
  closed_at
FROM epoch_ledger
ORDER BY id DESC
LIMIT 5;

-- ============================================================================
-- STEP 3: epoch_earnings — Per-wallet allocations
-- ============================================================================
SELECT 'STEP 3: epoch_earnings' as step;

SELECT
  status,
  COUNT(*) as count,
  SUM(amount_usdt) as sum_usdt,
  COUNT(DISTINCT wallet_or_node_id) as unique_wallets
FROM epoch_earnings
GROUP BY status;

-- Top unpaid earners
SELECT
  wallet_or_node_id,
  SUM(amount_usdt) as total_unpaid
FROM epoch_earnings
WHERE status = 'UNPAID'
GROUP BY wallet_or_node_id
ORDER BY total_unpaid DESC
LIMIT 10;

-- ============================================================================
-- STEP 4: settlement_batches — On-chain settlement tracking
-- ============================================================================
SELECT 'STEP 4: settlement_batches' as step;

SELECT
  status,
  COUNT(*) as count,
  SUM(total_amount_usdt) as sum_usdt,
  SUM(item_count) as total_items
FROM settlement_batches
GROUP BY status;

-- Recent batches
SELECT
  batch_id,
  epoch_id,
  status,
  total_amount_usdt,
  item_count,
  tx_hash,
  error_message,
  created_at
FROM settlement_batches
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: node_claims — Actual claimed withdrawals
-- ============================================================================
SELECT 'STEP 5: node_claims' as step;

SELECT
  COUNT(*) as total_claims,
  SUM(amount_usdt) as total_claimed_usdt,
  COUNT(DISTINCT node_id) as unique_claimers
FROM node_claims;

-- Recent claims
SELECT
  node_id,
  epoch_id,
  amount_usdt,
  tx_hash,
  claimed_at
FROM node_claims
ORDER BY claimed_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 6: Pipeline Summary — Identify bottleneck
-- ============================================================================
SELECT 'STEP 6: Pipeline Summary' as step;

WITH pipeline AS (
  SELECT
    'revenue_events_v2' as stage,
    1 as stage_order,
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM revenue_events_v2 WHERE is_test_data = false OR is_test_data IS NULL) as value_usdt
  UNION ALL
  SELECT
    'epoch_ledger (CLOSED)',
    2,
    (SELECT COALESCE(SUM(total_revenue), 0) FROM epoch_ledger WHERE status = 'CLOSED')
  UNION ALL
  SELECT
    'epoch_earnings (UNPAID)',
    3,
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM epoch_earnings WHERE status = 'UNPAID')
  UNION ALL
  SELECT
    'epoch_earnings (PAID)',
    4,
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM epoch_earnings WHERE status = 'PAID')
  UNION ALL
  SELECT
    'settlement_batches (confirmed)',
    5,
    (SELECT COALESCE(SUM(total_amount_usdt), 0) FROM settlement_batches WHERE status = 'confirmed')
  UNION ALL
  SELECT
    'node_claims',
    6,
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM node_claims)
)
SELECT
  stage,
  value_usdt,
  CASE
    WHEN stage_order = 1 THEN NULL
    ELSE LAG(value_usdt) OVER (ORDER BY stage_order) - value_usdt
  END as drop_from_previous
FROM pipeline
ORDER BY stage_order;

-- ============================================================================
-- STEP 7: Bottleneck Detection
-- ============================================================================
SELECT 'STEP 7: Bottleneck Detection' as step;

SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM revenue_events_v2 WHERE is_test_data = false OR is_test_data IS NULL) = 0
      THEN 'BOTTLENECK: No revenue events recorded'
    WHEN (SELECT COUNT(*) FROM epoch_ledger WHERE status = 'CLOSED') = 0
      THEN 'BOTTLENECK: No epochs closed — aggregation not running'
    WHEN (SELECT COUNT(*) FROM epoch_earnings) = 0
      THEN 'BOTTLENECK: Epochs closed but no earnings allocated'
    WHEN (SELECT COUNT(*) FROM epoch_earnings WHERE status = 'PAID') = 0
      AND (SELECT COUNT(*) FROM epoch_earnings WHERE status = 'UNPAID') > 0
      THEN 'BOTTLENECK: Earnings allocated but none paid — settlement not executing'
    WHEN (SELECT COUNT(*) FROM node_claims) = 0
      AND (SELECT COUNT(*) FROM epoch_earnings WHERE status = 'PAID') > 0
      THEN 'BOTTLENECK: Payments marked but no claims recorded'
    ELSE 'Pipeline operational — check treasury funding'
  END as diagnosis;
