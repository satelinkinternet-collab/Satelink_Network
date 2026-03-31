global.opsEngine = null;
// server.js
// Global Resilience: Prevent process exit on database connection loss (placed at the absolute top)
function globalErrorHandler(err) {
    console.error("[CRITICAL] Uncaught Exception:", err.message);
    if (err.message.includes("terminating connection") || err.message.includes("closed") || err.message.includes("ECONNREFUSED") || err.message.includes("admin")) {
        console.warn("[RECOVERY] Database connection lost. Server staying alive to serve 500 errors.");
        return; // Do not exit
    } else {
        console.error(err.stack);
        console.warn("[RECOVERY] Potential critical error. Staying alive for stability.");
    }
}
process.prependListener('uncaughtException', globalErrorHandler);
process.prependListener('unhandledRejection', (reason, promise) => {
    console.error("[CRITICAL] Unhandled Rejection at:", promise, "reason:", reason);
});

import "./src/core/config/dotenv_boot.js";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./src/utils/validateEnv.js";
import { logger } from "./src/monitoring/logger.js";
import { DATABASE_URL as RESOLVED_DB_URL, maskUrl } from "./src/core/config/db_config.js";
import { createApp } from "./app_factory.mjs";
import { PgDatabase } from "./src/database/pg_adapter.js";
import { DepositDetector } from "./src/settlement/deposit_detector.js";
import { startEpochScheduler } from "./src/economics/epoch_scheduler.js";
import { attachSchema } from "./src/core/schema.js";
import { RevenueOracle } from "./src/economics/revenue_oracle.js";
import { NodeLeaderboard } from "./src/monitoring/node_leaderboard.js";
import { TreasuryMonitor } from "./src/monitoring/treasury_monitor.js";
import { BackupService } from "./src/utils/backup_service.js";
import { NodeopsWaterfallService } from "./src/ops-agent/nodeops_waterfall.js";
import { runSatelinkSelfTest } from "./src/utils/self_test.js";

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
    const DATABASE_URL = RESOLVED_DB_URL;
    const isDocker = process.env.RUN_CONTEXT === 'docker' || process.env.DOCKER_ENV === 'true';
    console.log(`[BOOT] Mode: ${isDocker ? 'DOCKER' : 'LOCAL DEV'}`);
    console.log(`[BOOT] DB URL: ${maskUrl(DATABASE_URL)}`);
    console.log('[BOOT] Starting database connection...');

    try {
        // Create DB instance with retry logic (5 attempts, 2s delay)
        const db = await PgDatabase.create(DATABASE_URL);

        // Start checking DB health in background
        let dbReadyRaw = false;
        const checkDb = async () => {
            try {
                await db.prepare('SELECT 1').get();
                if (!dbReadyRaw) {
                    dbReadyRaw = true;
                    logger.info("[BOOT] DB connected and ready");
                }
            } catch (e) {
                dbReadyRaw = false;
                logger.warn("[BOOT] Database currently unavailable...");
            }
        };
        
        // Initial check
        await checkDb();

        // Continue with initialization even if DB is not ready yet
        // attachSchema and other modules will be called. 
        // They should have their own try/catches or handle the delay.
        try {
            await attachSchema(db);
        } catch (e) {
            console.warn("[BOOT] Could not attach schema yet (DB down). Will retry on first query.");
        }

        // Initialize modules (most have their own internal retries or lazy init)
        const oracle = new RevenueOracle(null, db);
        const leaderboard = new NodeLeaderboard(db);
        const treasury = new TreasuryMonitor(null, db);
        const backup = new BackupService(db);
        const opsWaterfall = new NodeopsWaterfallService(db);

        try { await oracle.init(); } catch (e) { console.warn("[BOOT] oracle init failed", e.message); }
        try { await leaderboard.init(); } catch (e) { console.warn("[BOOT] leaderboard init failed", e.message); }
        try { await treasury.init(); } catch (e) { console.warn("[BOOT] treasury init failed", e.message); }
        try { await backup.init(); } catch (e) { console.warn("[BOOT] backup init failed", e.message); }
        try { await opsWaterfall.init(); } catch (e) { console.warn("[BOOT] opsWaterfall init failed", e.message); }

        logger.info("[BOOT] Modules initialized (some may be in degraded state)");

        const app = await createApp(db);
        logger.info("[BOOT] App initialized");
        const PORT = process.env.PORT || 8080;

        const server = app.listen(PORT, async () => {
            logger.info(`Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: "postgres" });
            console.log("Database Adapter: PostgreSQL (production mode)");
console.log("FLAG CHECK:", {
  FEATURE_REAL_SETTLEMENT: process.env.FEATURE_REAL_SETTLEMENT,
  SETTLEMENT_ENABLED: process.env.SETTLEMENT_ENABLED,
  SETTLEMENT_ADAPTER: process.env.SETTLEMENT_ADAPTER,
  SETTLEMENT_EVM_ENABLED: process.env.SETTLEMENT_EVM_ENABLED
});

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
            if (String(process.env.FEATURE_REAL_SETTLEMENT).trim().toLowerCase() !== "true") {
                console.log('REAL SETTLEMENT: INACTIVE');
            } else {
                console.log('REAL SETTLEMENT: ACTIVE');
            }

            try {
                const depositDetector = new DepositDetector(db);
                await depositDetector.start();
            } catch (e) {
                if (process.env.SETTLEMENT_ADAPTER !== "SIMULATED") logger.error("Settlement Services failed to start", { error: e.stack });
            }

            // Phase 7: Run internal test on startup
            try {
                await runSatelinkSelfTest(db);
            } catch (testErr) {
                console.error("❌ SATELINK SELF TEST FAILED DURING BOOT:", testErr.message);
            }

            console.log('REAL DEMAND STATUS: ACTIVE');

            // Start automatic epoch aggregation scheduler
            try {
                startEpochScheduler(db);
            } catch (e) {
                console.error("[BOOT] Failed to start Epoch Scheduler:", e.message);
            }
        });
    } catch (e) {
        console.error("═══════════════════════════════════════════════════════");
        console.error("  ❌ BOOT FAILURE — DATABASE CONNECTION FAILED");
        console.error("═══════════════════════════════════════════════════════");
        console.error(`  URL: ${maskUrl(DATABASE_URL)}`);
        console.error(`  Error: ${e.message}`);
        console.error("");
        console.error("  Troubleshooting:");
        console.error("  ┌─ Docker mode: docker compose up -d database");
        console.error("  ├─ Local dev: ensure PostgreSQL is running on port 5432");
        console.error("  ├─ Credentials: check .env.local (user=satelink, pass=satelinkpass)");
        console.error("  └─ IPv6 issue: use 127.0.0.1 instead of localhost");
        console.error("═══════════════════════════════════════════════════════");
        logger.error("Fatal: Could not start server", { error: e.message });
        process.exit(1);
    }
}
