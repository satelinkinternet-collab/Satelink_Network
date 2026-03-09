import Database from "better-sqlite3";
import "dotenv/config";

const SQLITE_PATH = process.env.SQLITE_PATH || "satelink.db";

let db = null;

export function openDb() {
    if (!db) {
        db = new Database(SQLITE_PATH);
        db.pragma("journal_mode = WAL");
    }
    return db;
}

export function run(sql, params = []) {
    const d = openDb();
    return d.prepare(sql).run(params);
}

export function get(sql, params = []) {
    const d = openDb();
    return d.prepare(sql).get(params);
}

export function all(sql, params = []) {
    const d = openDb();
    return d.prepare(sql).all(params);
}

export function exec(sql) {
    const d = openDb();
    return d.exec(sql);
}

export { db };
