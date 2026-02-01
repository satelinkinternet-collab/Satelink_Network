-- LAYER-5.5: Ops Metering + Protocol Pools + Reward Distribution
-- Project: Satelink
-- Safe to run multiple times

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS protocol_pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  epoch_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  total_amount REAL NOT NULL,

  status TEXT NOT NULL,      -- open | finalized
  created_at INTEGER NOT NULL,

  UNIQUE(epoch_id, token),
  FOREIGN KEY(epoch_id) REFERENCES epochs(id)
);

-- Ops metering per epoch (raw counts, no rewards yet)
CREATE TABLE IF NOT EXISTS op_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  epoch_id INTEGER NOT NULL,
  user_wallet TEXT NOT NULL,
  op_type TEXT NOT NULL,

  ops INTEGER NOT NULL DEFAULT 0,
  weight REAL NOT NULL,

  created_at INTEGER NOT NULL,

  UNIQUE(epoch_id, user_wallet, op_type),
  FOREIGN KEY(epoch_id) REFERENCES epochs(id)
);

CREATE INDEX IF NOT EXISTS idx_op_counts_epoch
  ON op_counts(epoch_id);

CREATE INDEX IF NOT EXISTS idx_op_counts_wallet
  ON op_counts(user_wallet);

CREATE INDEX IF NOT EXISTS idx_op_counts_type
  ON op_counts(op_type);

