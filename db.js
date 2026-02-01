db.js
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function getDb() {
  const db = await open({
    filename: "./satelink.db",
    driver: sqlite3.Database,
  });

  // Create registered_nodes table (safe to run every time)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS registered_nodes (
      wallet TEXT PRIMARY KEY,
      active INTEGER DEFAULT 1,
      registered_at_block INTEGER DEFAULT 0,
      registered_at_ts INTEGER DEFAULT 0,
      updated_at_ts INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_registered_nodes_active
      ON registered_nodes(active);
  `);

  return db;
}

module.exports = { getDb };
