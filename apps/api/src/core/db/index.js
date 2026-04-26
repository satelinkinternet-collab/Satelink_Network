
import { PgDatabase } from "../../database/pg_adapter.js";

/**
 * UniversalDB alias for PgDatabase to maintain backward compatibility 
 * for scripts still importing it by name.
 */
export const UniversalDB = PgDatabase;

/**
 * getValidatedDB — returns a PgDatabase instance.
 * PostgreSQL is the only supported database.
 */
export function getValidatedDB(config) {
    const dbUrl = config?.dbUrl || process.env.DATABASE_URL;

    if (!dbUrl) {
        throw new Error("[FATAL] DATABASE_URL is required (PostgreSQL)");
    }

    return new PgDatabase();
}
