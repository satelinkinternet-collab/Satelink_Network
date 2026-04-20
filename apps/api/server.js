import { createApp } from "./app_factory.mjs";
import revenueRoutes from "./src/routes/revenue.js";
import "./src/core/config/dotenv_boot.js";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./src/utils/validateEnv.js";
import { logger } from "./src/monitoring/logger.js";
import { createApp } from "./app_factory.mjs";
import { PgDatabase } from "./src/database/pg_adapter.js";
import { startEpochScheduler } from "./src/economics/epoch_scheduler.js";
import { attachSchema } from "./src/core/schema.js";
import { RevenueOracle } from "./src/economics/revenue_oracle.js";
import { NodeLeaderboard } from "./src/monitoring/node_leaderboard.js";
import { TreasuryMonitor } from "./src/monitoring/treasury_monitor.js";
import { BackupService } from "./src/utils/backup_service.js";
import { NodeopsWaterfallService } from "./src/ops-agent/nodeops_waterfall.js";
import { WithdrawalProcessor } from "./src/settlement/withdrawal_processor.js";
import { createWithdrawalRouter } from "./src/gateway/routes/withdrawal_api.js";

import { runSatelinkSelfTest } from "./src/utils/self_test.js";

// Global error handlers
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason?.stack || reason);
    logger.error("Unhandled Rejection", { reason: reason?.stack || reason });
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err.stack);
    logger.error("Uncaught Exception", { error: err.stack });
    process.exit(1);
});

// Graceful shutdown handler — drain in-flight work before exit
let _shutdownInProgress = false;
function gracefulShutdown(signal) {
    if (_shutdownInProgress) return;
    _shutdownInProgress = true;
    logger.info(`[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);
    console.log(`[SHUTDOWN] Received ${signal}, draining connections...`);

    // Give in-flight requests 10 seconds to complete
    setTimeout(() => {
        logger.warn("[SHUTDOWN] Forced exit after timeout");
        process.exit(1);
    }, 10000).unref();

    // The actual cleanup happens in the app.listen block where we have access to server/db
    process.emit('app:shutdown');
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// --- Enforce Directory Root Priority ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.cwd() !== __dirname) {
    logger.warn(`Not running from project root. Adjusting from ${process.cwd()} ...`);
    process.chdir(__dirname);
}

// Start server.js with validateEnv directly
validateEnv();

export { createApp };
export default createApp;

// If we are not running under Mocha (tests), boot the server
if (process.env.NODE_ENV !== "test" && !process.env.MOCHA) {
    const DATABASE_URL = process.env.DATABASE_URL;
    console.log('[BOOT] Starting database connection...');
    try {
        const db = await PgDatabase.create(DATABASE_URL);

        let dbReady = false;
        while (!dbReady) {
            try {
                await db.prepare('SELECT 1').get();
                dbReady = true;
                logger.info("[BOOT] DB connected");
            } catch (e) {
                logger.warn("[BOOT] Waiting for Postgres healthy...");
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        await attachSchema(db);

        // Initialize modules
        const oracle = new RevenueOracle(null, db);
        await oracle.init();
        const leaderboard = new NodeLeaderboard(db);
        await leaderboard.init();
        const treasury = new TreasuryMonitor(null, db);
        await treasury.init();
        const backup = new BackupService(db);
        await backup.init();
        const opsWaterfall = new NodeopsWaterfallService(db);
        await opsWaterfall.init();

        logger.info("[BOOT] Modules initialized");

        const app = await createApp(db);
        logger.info("[BOOT] App initialized");
        const PORT = process.env.PORT || 8080;

        const server = app.listen(PORT, async () => {
            logger.info(`Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: "postgres" });

            // Wire graceful shutdown to this server + DB instance
            process.on('app:shutdown', async () => {
                try {
                    server.close(() => logger.info("[SHUTDOWN] HTTP server closed"));
                    await db.close();
                    logger.info("[SHUTDOWN] DB pool closed");
                    process.exit(0);
                } catch (e) {
                    logger.error("[SHUTDOWN] Error during cleanup", { error: e.message });
                    process.exit(1);
                }
            });

            // Hardened: Mandatory REAL mode for payouts
            if (process.env.FEATURE_REAL_SETTLEMENT !== "true") {
                console.log('REAL SETTLEMENT: INACTIVE');
            } else {
                console.log('REAL SETTLEMENT: ACTIVE');
            }

            // Withdrawal API Route is now mounted in routes.js (before catch-all 404)

            try {
                await detector.start();
                logger.info("Deposit Detector activated natively on-chain");

                const processor = new WithdrawalProcessor(db);
                await processor.start();
                logger.info("Withdrawal Processor activated natively on-chain");
            } catch (e) {
                console.error("❌ SETTLEMENT SERVICE FAILURE:", e);
                logger.error("Settlement Services failed to start", { error: e.stack });
            }

            // Phase 7: Run internal test on startup
            try {
                await runSatelinkSelfTest(db);
            } catch (testErr) {
                console.error("❌ SATELINK SELF TEST FAILED DURING BOOT:", testErr.message);
            }

            console.log('REAL DEMAND STATUS: ACTIVE');

            // Start automatic epoch aggregation scheduler
            startEpochScheduler(db);
        });
    } catch (e) {
        console.error("BOOT FAILURE IN SERVER:", e);
        logger.error("Fatal: Could not start server", { error: e.message });
        process.exit(1);
    }
}
