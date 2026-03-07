export function attachSchema(db) {
  const ensure = (sql) => {
    try {
      db.prepare(sql).run();
    } catch (e) {
      // Ignore errors for existing tables/columns
    }
  };

  const hasCol = (table, col) => {
    try {
      const rows = db.prepare(`PRAGMA table_info(${table})`).all();
      return rows.some((r) => r.name === col);
    } catch (e) {
      return false;
    }
  };

  // Create tables
  ensure(`CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS op_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch_id INTEGER,
    user_wallet TEXT,
    op_type TEXT,
    ops INTEGER,
    weight REAL,
    created_at INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS revenue_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL,
    token TEXT,
    source TEXT,
    created_at INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS registered_nodes (
    wallet TEXT PRIMARY KEY,
    is_flagged INTEGER DEFAULT 0,
    last_nonce INTEGER DEFAULT -1,
    last_heartbeat INTEGER,
    active INTEGER DEFAULT 1,
    node_type TEXT DEFAULT 'self_hosted',
    latency REAL DEFAULT 0,
    bandwidth REAL DEFAULT 0,
    infra_reserved REAL DEFAULT 0,
    updatedAt INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS enterprise_clients (
    client_id TEXT PRIMARY KEY,
    company_name TEXT,
    wallet_address TEXT,
    plan_type TEXT DEFAULT 'BASIC',
    rate_per_op REAL DEFAULT 0.002,
    monthly_minimum REAL DEFAULT 1000,
    deposit_balance REAL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS enterprise_api_keys (
    api_key TEXT PRIMARY KEY,
    client_id TEXT,
    created_at INTEGER,
    FOREIGN KEY(client_id) REFERENCES enterprise_clients(client_id)
  )`);

  // Ensure columns (to handle schema evolution in prod)
  if (!hasCol("op_counts", "epoch_id")) ensure(`ALTER TABLE op_counts ADD COLUMN epoch_id INTEGER`);
  if (!hasCol("op_counts", "user_wallet")) ensure(`ALTER TABLE op_counts ADD COLUMN user_wallet TEXT`);
  if (!hasCol("op_counts", "op_type")) ensure(`ALTER TABLE op_counts ADD COLUMN op_type TEXT`);
  if (!hasCol("op_counts", "ops")) ensure(`ALTER TABLE op_counts ADD COLUMN ops INTEGER`);
  if (!hasCol("op_counts", "weight")) ensure(`ALTER TABLE op_counts ADD COLUMN weight REAL`);
  if (!hasCol("op_counts", "created_at")) ensure(`ALTER TABLE op_counts ADD COLUMN created_at INTEGER`);

  if (!hasCol("revenue_events", "amount")) ensure(`ALTER TABLE revenue_events ADD COLUMN amount REAL`);
  if (!hasCol("revenue_events", "token")) ensure(`ALTER TABLE revenue_events ADD COLUMN token TEXT`);
  if (!hasCol("revenue_events", "source")) ensure(`ALTER TABLE revenue_events ADD COLUMN source TEXT`);
  if (!hasCol("revenue_events", "created_at")) ensure(`ALTER TABLE revenue_events ADD COLUMN created_at INTEGER`);

  // Feature: link revenue event to enterprise
  if (!hasCol("revenue_events", "enterprise_id")) ensure(`ALTER TABLE revenue_events ADD COLUMN enterprise_id TEXT`);

  // Bootstrap rows
  ensure(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('security_freeze', '0')`);
  ensure(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('withdrawals_paused', '0')`);
}
