import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function migrate(db) {
    console.log("[MIGRATION] Starting...");
    const sqlDir = path.resolve(path.join(__dirname, "..", "sql"));
    const files = fs.readdirSync(sqlDir)
        .filter(f => f.endsWith(".sql"))
        .sort();

    for (const file of files) {
        console.log(`[MIGRATION] Applying ${file}`);
        const sql = fs.readFileSync(path.join(sqlDir, file), "utf8");
        try {
            db.exec(sql);
        } catch (e) {
            // Ignore duplicate column / table errors for idempotency
            if (!e.message.includes("duplicate column") && !e.message.includes("already exists")) {
                console.warn(`[MIGRATION] Warning in ${file}: ${e.message}`);
            }
        }
    }
    console.log("[MIGRATION] Complete.");
}

// CLI entry
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
    const Database = (await import("better-sqlite3")).default;
    const dbPath = process.env.SQLITE_PATH || "satelink.db";
    const db = new Database(dbPath);
    migrate(db);
    db.close();
}
