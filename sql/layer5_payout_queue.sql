-- LAYER-5: Payout Queue (Settlement)
-- Project: Satelink
-- Safe to run multiple times

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payout_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_wallet TEXT NOT NULL,
  user_type TEXT NOT NULL,

  amount REAL NOT NULL,
  token TEXT NOT NULL,

  epoch_id INTEGER,
  method TEXT NOT NULL,        -- record_only | onchain | offchain | offramp
  status TEXT NOT NULL,        -- queued | processing | sent | failed

  tx_hash TEXT,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at INTEGER NOT NULL,

  FOREIGN KEY(epoch_id) REFERENCES epochs(id)
);

CREATE INDEX IF NOT EXISTS idx_payout_wallet_status ON payout_queue(user_wallet, status);
CREATE INDEX IF NOT EXISTS idx_payout_epoch ON payout_queue(epoch_id);

