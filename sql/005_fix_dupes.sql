-- 005_fix_dupes.sql — Clean duplicates and add unique constraints

-- 1. Clean duplicates from payments_inbox (keep latest)
DELETE FROM payments_inbox 
WHERE rowid NOT IN (
    SELECT MAX(rowid) 
    FROM payments_inbox 
    GROUP BY provider, event_id
);

-- 2. Add Unique Index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_inbox_dedupe ON payments_inbox(provider, event_id);

-- 3. Clean duplicates from revenue_events (keep latest) based on tx_ref if present
DELETE FROM revenue_events 
WHERE tx_ref IS NOT NULL AND rowid NOT IN (
    SELECT MAX(rowid) 
    FROM revenue_events 
    WHERE tx_ref IS NOT NULL
    GROUP BY tx_ref
);

-- 4. Add Unique Index for revenue events
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_events_dedupe ON revenue_events(tx_ref);

-- 5. Ensure distribution_runs idempotency (already checked by code, but db constraint helps)
CREATE UNIQUE INDEX IF NOT EXISTS idx_distribution_runs_epoch ON distribution_runs(epoch_id);
