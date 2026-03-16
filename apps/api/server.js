import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./src/utils/validateEnv.js";
import { logger } from "./src/monitoring/logger.js";
import { createApp } from "./app_factory.mjs";
import { getValidatedDB } from "./src/core/db/index.js";
import { DepositDetector } from "./src/settlement/deposit_detector.js";
import { BatchCreator } from "./src/settlement/batch_creator.js";
import { Scheduler } from "./src/monitoring/ops/scheduler.js";
import { AlertService } from "./src/monitoring/ops/alerts.js";
import { RuntimeMonitor } from "./src/monitoring/runtime_monitor.js";
import { OperationsEngine } from "./src/core/operations_engine.js";
import { MemoryWatchdog } from "./src/monitoring/memory_watchdog.js";

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
    // Use UniversalDB: PostgreSQL when DATABASE_URL is set, SQLite otherwise
    const db = getValidatedDB({
        sqlitePath: process.env.SQLITE_PATH || "satelink.db"
    });
    await db.init();

    const app = createApp(db);
    const PORT = process.env.PORT || 8080;

    const server = app.listen(PORT, async () => {
        logger.info(`🚀 Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: db.type });

        // Start Deposit Detector if Real Settlement is enabled
        if (process.env.FEATURE_REAL_SETTLEMENT === 'true') {
            try {
                const detector = new DepositDetector(db);
                await detector.start();
                logger.info("Deposit Detector activated natively on-chain");
            } catch (e) {
                logger.error("Failed to start Deposit Detector", { error: e.message });
            }
        } else {
            logger.info("Simulated mode - Deposit Detector offline.");
        }

        // Start Settlement Pipeline: batch creator + engine processing loop
        const settlementEngine = app.get('settlementEngine');
        if (settlementEngine) {
            const batchCreator = new BatchCreator(db);
            const SETTLEMENT_INTERVAL = parseInt(process.env.SETTLEMENT_INTERVAL_MS) || 60000;

            const settlementTimer = setInterval(async () => {
                try {
                    await batchCreator.createBatches();
                    await settlementEngine.processQueue();
                } catch (e) {
                    logger.error("Settlement cycle error", { error: e.message });
                }
            }, SETTLEMENT_INTERVAL);

            app.set('settlementTimer', settlementTimer);
            app.set('batchCreator', batchCreator);
            logger.info("Settlement pipeline active", { intervalMs: SETTLEMENT_INTERVAL });
        }

        // Start Scheduler (7-loop background orchestrator)
        try {
            const opsEngine = new OperationsEngine(db, null, null);
            await opsEngine.init();
            const alertService = new AlertService();
            const runtimeMonitor = new RuntimeMonitor();
            const scheduler = new Scheduler(opsEngine, alertService, runtimeMonitor, null, {});
            scheduler.start();
            app.set('scheduler', scheduler);
            logger.info("Scheduler started (epoch, health, node lifecycle, maintenance, runtime, backup, economics)");

            // Start Memory Watchdog for 72h endurance monitoring
            const memWatchdog = new MemoryWatchdog({
                intervalMs: 60000,
                windowMs: 30 * 60 * 1000,
                threshold: 0.30,
                onWarning: (msg) => {
                    logger.warn(msg);
                    alertService.send?.(msg, 'warn').catch(() => {});
                },
            });
            memWatchdog.start();
            app.set('memoryWatchdog', memWatchdog);
        } catch (e) {
            logger.error("Scheduler startup failed", { error: e.message });
        }
    });

    // Store references for graceful shutdown
    app.set('server', server);
    app.set('db', db);

    // ── Graceful Shutdown ──
    let isShuttingDown = false;

    async function gracefulShutdown(signal) {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.info(`${signal} received — starting graceful shutdown`);

        // 1. Stop settlement timer, scheduler, and memory watchdog
        const settlementTimer = app.get('settlementTimer');
        if (settlementTimer) clearInterval(settlementTimer);
        const scheduler = app.get('scheduler');
        if (scheduler) scheduler.stop();
        const memWatchdog = app.get('memoryWatchdog');
        if (memWatchdog) memWatchdog.stop();

        // 2. Stop accepting new connections
        server.close(() => {
            logger.info("HTTP server closed");
        });

        // 3. Allow in-flight requests to drain (max 2s)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. Close database connection
        try {
            db.close();
            logger.info("Database connection closed");
        } catch (e) {
            logger.error("Error closing database", { error: e.message });
        }

        logger.info("Shutdown complete");
        process.exit(0);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
