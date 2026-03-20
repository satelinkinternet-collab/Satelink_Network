
import { PgDatabase } from "../../database/pg_adapter.js";

/**
 * UniversalDB alias for PgDatabase to maintain backward compatibility 
 * for scripts still importing it by name.
 */
export const UniversalDB = PgDatabase;

/**
 * getValidatedDB — returns a PgDatabase instance.
 * SQLite is no longer supported and will throw an error.
 */
export function getValidatedDB(config) {
    const dbUrl = config?.dbUrl || process.env.DATABASE_URL;

    if (!dbUrl || dbUrl.startsWith('sqlite:')) {
        throw new Error("[FATAL] PostgreSQL DATABASE_URL is required. SQLite is no longer supported.");
    }

    // We can't easily make this async if callers expect sync return.
    // However, most callers in this app use 'await PgDatabase.create' or just new instance if pool is managed.
    // Given the previous UniversalDB was sync-init with internal async pool, 
    // we'll provide a helper that throws if not using PgDatabase.create instead.
    
    console.warn("[getValidatedDB] Standardized to PostgreSQL.");
    return new PgDatabase();
}
