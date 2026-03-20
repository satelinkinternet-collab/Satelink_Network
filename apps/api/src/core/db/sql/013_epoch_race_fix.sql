-- 013_epoch_race_fix.sql
-- Add unique constraint on (epoch_id) concept via a deterministic epoch identifier.
-- The epoch_id column already exists as the PK (id). We add a computed epoch_slot
-- column that prevents duplicate OPEN epochs for the same time window.

ALTER TABLE epochs ADD COLUMN epoch_slot INTEGER;

-- Backfill existing epochs with their computed slot (3600s window)
UPDATE epochs SET epoch_slot = CAST(starts_at / 3600 AS INTEGER) WHERE epoch_slot IS NULL;

-- Create unique index on epoch_slot to prevent race-condition duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_epochs_slot_unique ON epochs (epoch_slot);
