console.log("REVENUE_ROUTE_LOADED");
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./utils/validateEnv.js";
import { logger } from "./utils/logger.js";
import { createApp } from "./app_factory.mjs";
import { PgDatabase } from "./apps/api/src/database/pg_adapter.js";

// --- Enforce Directory Root Priority ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.cwd() !== __dirname) {
    logger.warn(`⚠️ Not running from project root. Adjusting from ${process.cwd()} ...`);
    process.chdir(__dirname);
}

// Ensure startup meets minimal dependencies
validateEnv();

export { createApp };
export default createApp;

// If we are not running under Mocha (tests), boot the server
if (process.env.NODE_ENV !== "test" && !process.env.MOCHA) {
    (async () => {
        try {
            // PostgreSQL connection (replaces SQLite — NO SQLITE ANYWHERE per CLAUDE.md)
            const db = await PgDatabase.create(process.env.DATABASE_URL);
            logger.info("PostgreSQL connected successfully");

            const app = createApp(db);
            const PORT = process.env.PORT || 8080;

            app.listen(PORT, () => {
                logger.info(`🚀 Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: 'postgresql' });

                // Note: DepositListener wiring will be added in PROMPT 5
                // after credit_gate and credits router are mounted
                if (process.env.FEATURE_REAL_SETTLEMENT === 'true') {
                    logger.info("Real settlement mode — DepositListener pending wiring");
                } else {
                    logger.info("Simulated mode — DepositListener offline");
                }
            });
        } catch (err) {
            logger.error("Server startup failed", { error: err.message });
            process.exit(1);
        }
    })();
}
