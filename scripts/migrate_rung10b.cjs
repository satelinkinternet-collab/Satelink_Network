
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../satelink.db');
const db = new sqlite3.Database(dbPath);

const schema = `
CREATE TABLE IF NOT EXISTS builders (
    wallet TEXT PRIMARY KEY,
    created_at INTEGER
);
CREATE TABLE IF NOT EXISTS builder_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    builder_wallet TEXT,
    name TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER
);
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    key_hash TEXT,
    key_prefix TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    revoked_at INTEGER
);
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    ts INTEGER,
    endpoint TEXT,
    ok INTEGER,
    cost_usdt REAL,
    meta_json TEXT
);
`;

db.serialize(() => {
    console.log("Running Rung 10b Migration...");
    db.exec(schema, (err) => {
        if (err) {
            console.error("Migration Failed:", err);
            process.exit(1);
        } else {
            console.log("Migration Success: Builder tables created.");
            process.exit(0);
        }
    });
});
