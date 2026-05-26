console.log("REVENUE_ROUTE_LOADED");
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./utils/validateEnv.js";
import { logger } from "./utils/logger.js";
import { createApp } from "./app_factory.mjs";
import { PgDatabase } from "./apps/api/src/database/pg_adapter.js";
import { DepositListener } from "./apps/api/src/services/deposit_listener.js";
import { runMigrations } from "./apps/api/src/db/migrate.js";

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
        let depositListener = null;

        try {
            // PostgreSQL connection (replaces SQLite — NO SQLITE ANYWHERE per CLAUDE.md)
            const db = await PgDatabase.create(process.env.DATABASE_URL);
            console.log('[server.js] DB connected, about to run migrations');
            logger.info("PostgreSQL connected successfully");

            // ── Run migrations (idempotent — safe to run every startup)
            console.log('[server.js] Calling runMigrations now...');
            await runMigrations(db.pool);
            console.log('[server.js] runMigrations completed successfully');

            // ── Autonomous payer: watch Polygon Mainnet for USDT deposits
            depositListener = new DepositListener(db.pool, logger);
            await depositListener.start();

            const app = createApp(db);
            const PORT = process.env.PORT || 8080;

            app.listen(PORT, () => {
                logger.info(`🚀 Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: 'postgresql' });
                logger.info("DepositListener active — watching for USDT deposits on Polygon Mainnet");
            });

            // ── Graceful shutdown
            const shutdown = async (signal) => {
                logger.info(`Received ${signal} — shutting down gracefully`);
                if (depositListener) {
                    await depositListener.stop();
                }
                process.exit(0);
            };
            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));

        } catch (err) {
            logger.error("Server startup failed", { error: err.message });
            process.exit(1);
        }
    })();
}
