-- LAYER-5: Rewards, Ledger & Payout Engine
-- Project: Satelink
-- This file defines database tables for Layer-5

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS epochs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  epoch_type TEXT NOT NULL,
  epoch_key TEXT NOT NULL,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(epoch_type, epoch_key)
);

CREATE TABLE IF NOT EXISTS reward_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_wallet TEXT NOT NULL,
  user_type TEXT NOT NULL,
  role TEXT,

  amount REAL NOT NULL,
  token TEXT NOT NULL,
  source_type TEXT NOT NULL,

  epoch_id INTEGER,
  status TEXT NOT NULL,

  payout_queue_id INTEGER,
  note TEXT,

  created_at INTEGER NOT NULL,

  FOREIGN KEY(epoch_id) REFERENCES epochs(id)
);

CREATE INDEX IF NOT EXISTS idx_reward_wallet_status ON reward_ledger(user_wallet, status);
CREATE INDEX IF NOT EXISTS idx_reward_epoch ON reward_ledger(epoch_id);

