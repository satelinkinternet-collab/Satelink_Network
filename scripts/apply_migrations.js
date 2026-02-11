import fs from "fs";
import path from "path";
import { openDb } from "../src/db/sqlite.js";

const sqlFile = path.resolve("sql/antigravity_day1_revenue.sql");

export function applyMigrations() {
    const db = openDb();

    console.log("[MIGRATION] Starting drift repair...");

    // 1. Core Tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS payments_inbox (
            provider TEXT NOT NULL,
            event_id TEXT NOT NULL,
            status TEXT NOT NULL,
            payload_json TEXT,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (provider, event_id)
        );
        
        CREATE TABLE IF NOT EXISTS ops_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_wallet TEXT NOT NULL,
            op_type TEXT NOT NULL,
            qty INTEGER NOT NULL,
            unit_price_usdt REAL NOT NULL,
            total_usdt REAL NOT NULL,
            created_at INTEGER NOT NULL
        );
    `);

    // 2. Ensuring revenue_events has ALL required columns
    const requiredCols = [
        { name: "amount", type: "REAL", def: "0" },
        { name: "token", type: "TEXT", def: "'USDT'" },
        { name: "source", type: "TEXT", def: "'UNKNOWN'" },
        { name: "payer_wallet", type: "TEXT", def: "NULL" },
        { name: "reference", type: "TEXT", def: "NULL" },
        { name: "source_type", type: "TEXT", def: "NULL" },
        { name: "provider", type: "TEXT", def: "NULL" },
        { name: "amount_usdt", type: "REAL", def: "0" },
        { name: "tx_ref", type: "TEXT", def: "NULL" },
        { name: "epoch_id", type: "INTEGER", def: "0" },
        { name: "created_at", type: "INTEGER", def: "0" }
    ];

    const currentCols = db.pragma("table_info(revenue_events)").map(c => c.name);

    for (const col of requiredCols) {
        if (!currentCols.includes(col.name)) {
            console.log(`[MIGRATION] Adding missing column: ${col.name}`);
            try {
                db.prepare(`ALTER TABLE revenue_events ADD COLUMN ${col.name} ${col.type}`).run();
            } catch (e) {
                console.error(`[MIGRATION] Error adding ${col.name}:`, e.message);
            }
        }
    }

    console.log("[MIGRATION] Drift repair completed.");
}

if (process.argv[1] === import.meta.filename || process.argv[1].endsWith('apply_migrations.js')) {
    applyMigrations();
}
