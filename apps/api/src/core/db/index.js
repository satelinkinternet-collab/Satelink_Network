
import { PgDatabase } from "../../database/pg_adapter.js";

function normalizeDbInterface(db) {
    // Ensure db.exec(sql) exists for postgres wrapper used across the app.
    if (db && typeof db.exec === "function") return db;

    const raw = (db && db.db) ? db.db : db;

    if (raw && typeof raw.exec === "function") {
        db.exec = raw.exec.bind(raw);
        return db;
    }

    if (raw && typeof raw.run === "function") {
        db.exec = (sql) => raw.run(sql);
        return db;
    }

    throw new Error("[FATAL] DB adapter missing exec/run. Cannot run migrations.");
}

export { PgDatabase };

/**
 * @deprecated Use PgDatabase directly. This function exists only for backward compatibility.
 */
export function getValidatedDB(config) {
    const dbUrl = config?.dbUrl || process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error("[FATAL] DATABASE_URL is required. PostgreSQL is the only supported database.");
    }

    // Return a PgDatabase instance (caller must call .init() or use PgDatabase.create())
    const db = new PgDatabase();
    return db;
}
