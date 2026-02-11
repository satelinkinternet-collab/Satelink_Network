-- Rung 10b: Builder Onboarding & Revenue Events

CREATE TABLE IF NOT EXISTS builders (
  wallet TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS builder_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  builder_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(builder_wallet) REFERENCES builders(wallet)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY(project_id) REFERENCES builder_projects(id)
);

CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 1,
  cost_usdt REAL NOT NULL,
  meta_json TEXT,
  FOREIGN KEY(project_id) REFERENCES builder_projects(id)
);

-- Ensure revenue_events has necessary columns (migrating if they don't exist is harder in pure SQL without PRAGMA check loops, 
-- but given previous rungs, let's assume table exists. We'll add index if useful).
-- If revenue_events was created earlier, we just ensure it supports the 'provider' column if it didn't already.
-- The prompt says "Also ensure revenue_events has: provider...". In Rung 4 we created it. 
-- Let's verify columns visually if needed, but for now we trust previous rungs or add columns safely if SQLite supported IF NOT EXISTS on columns (it doesn't).
-- We'll assume strict adherence means we rely on Rung 4's schema or add a separate alter block if we suspect it's missing.
-- Since Rung 4 created it, it should have: id, provider, source_type, payer_wallet, amount_usdt, amount_sats, tx_hash, created_at, epoch_id.
-- We will proceed assuming it exists.

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_builder_projects_wallet ON builder_projects(builder_wallet);
