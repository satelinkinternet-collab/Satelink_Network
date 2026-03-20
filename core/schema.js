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
    last_nonce INTEGER DEFAULT -1
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

    // Bootstrap rows
    ensure(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('security_freeze', '0')`);
    ensure(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('withdrawals_paused', '0')`);
}
