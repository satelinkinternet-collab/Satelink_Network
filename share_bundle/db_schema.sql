CREATE TABLE heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nodeWallet TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  nonce TEXT NOT NULL,
  signature TEXT NOT NULL,
  payload TEXT,
  createdAt INTEGER NOT NULL
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE UNIQUE INDEX idx_node_nonce 
ON heartbeats(nodeWallet, nonce);
CREATE TABLE node_status (
  nodeWallet TEXT PRIMARY KEY,
  lastSeen INTEGER NOT NULL,
  online INTEGER NOT NULL
);
CREATE TABLE epoch_uptime (
  epochStart INTEGER NOT NULL,
  epochEnd INTEGER NOT NULL,
  nodeWallet TEXT NOT NULL,
  heartbeats INTEGER NOT NULL,
  expected INTEGER NOT NULL,
  uptimePct REAL NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY(epochStart, epochEnd, nodeWallet)
);
CREATE TABLE registered_nodes (
  wallet TEXT PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 1,
  registeredAt INTEGER DEFAULT 0,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX idx_registered_nodes_active
ON registered_nodes(active);
CREATE TABLE epoch_rewards (  id INTEGER PRIMARY KEY AUTOINCREMENT,  epochStart INTEGER NOT NULL,  epochEnd   INTEGER NOT NULL,  nodeWallet TEXT NOT NULL,  uptimePct  REAL NOT NULL,  qualified  INTEGER NOT NULL CHECK (qualified IN (0,1)),  rewardAmount TEXT NOT NULL DEFAULT '0',  rewardToken  TEXT NOT NULL DEFAULT 'SAT',  payoutChain TEXT,  payoutTxHash TEXT,  payoutStatus TEXT NOT NULL DEFAULT 'pending',  createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now')),  UNIQUE(epochStart, epochEnd, nodeWallet));
CREATE INDEX idx_epoch_rewards_epoch
ON epoch_rewards(epochStart, epochEnd);
CREATE INDEX idx_epoch_rewards_wallet
ON epoch_rewards(nodeWallet);
CREATE TABLE epochs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  epoch_type TEXT NOT NULL,
  epoch_key TEXT NOT NULL,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(epoch_type, epoch_key)
);
CREATE TABLE reward_ledger (
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
CREATE INDEX idx_reward_wallet_status ON reward_ledger(user_wallet, status);
CREATE INDEX idx_reward_epoch ON reward_ledger(epoch_id);
CREATE TABLE payout_queue (
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
CREATE INDEX idx_payout_wallet_status ON payout_queue(user_wallet, status);
CREATE INDEX idx_payout_epoch ON payout_queue(epoch_id);
CREATE TABLE protocol_pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  epoch_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  total_amount REAL NOT NULL,

  status TEXT NOT NULL,      -- open | finalized
  created_at INTEGER NOT NULL,

  UNIQUE(epoch_id, token),
  FOREIGN KEY(epoch_id) REFERENCES epochs(id)
);
CREATE TABLE op_counts (
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
CREATE INDEX idx_op_counts_epoch
  ON op_counts(epoch_id);
CREATE INDEX idx_op_counts_wallet
  ON op_counts(user_wallet);
CREATE INDEX idx_op_counts_type
  ON op_counts(op_type);
CREATE TABLE op_weights (
  op_type TEXT PRIMARY KEY,
  weight REAL NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX uniq_reward_protocol_pool
ON reward_ledger(epoch_id, user_wallet, token, source_type);
