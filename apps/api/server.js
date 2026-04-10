import dotenv from "dotenv";
dotenv.config({ path: "../../.env", override: true });
global.opsEngine = null;

// server.js — Satelink Backend Entry Point

// PART 2: Prevent EIO crash when running without a TTY (nohup, background, CI)
process.stdin.resume();
process.stdin.on("error", () => {});

// Global Resilience: Prevent process exit on database connection loss
function globalErrorHandler(err) {
    console.error("[CRITICAL] Uncaught Exception:", err.message);
    if (err.message.includes("terminating connection") || err.message.includes("closed") || err.message.includes("ECONNREFUSED") || err.message.includes("admin")) {
        console.warn("[RECOVERY] Database connection lost. Server staying alive to serve 500 errors.");
        return;
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
let _serverRef = null;
let _dbRef = null;

function gracefulShutdown(signal) {
    if (_shutdownInProgress) return;
    _shutdownInProgress = true;
    logger.info(`[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);
    console.log(`[SHUTDOWN] Received ${signal}, draining connections...`);

    setTimeout(() => {
        logger.warn("[SHUTDOWN] Forced exit after timeout");
        process.exit(1);
    }, 10000).unref();

    (async () => {
        try {
            if (_serverRef) _serverRef.close(() => logger.info("[SHUTDOWN] HTTP server closed"));
            if (_dbRef) await _dbRef.close();
            logger.info("[SHUTDOWN] DB pool closed");
            process.exit(0);
        } catch (e) {
            logger.error("[SHUTDOWN] Error during cleanup", { error: e.message });
            process.exit(1);
        }
    })();
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

validateEnv();

export { createApp };
export default createApp;

// PART 1: Bootstrap — all async init happens BEFORE app.listen()
async function bootstrap() {
    const DATABASE_URL = RESOLVED_DB_URL;
    const isDocker = process.env.RUN_CONTEXT === 'docker' || process.env.DOCKER_ENV === 'true';
    console.log(`[BOOT] Mode: ${isDocker ? 'DOCKER' : 'LOCAL DEV'}`);
    console.log(`[BOOT] DB URL: ${maskUrl(DATABASE_URL)}`);
    console.log('[BOOT] Starting database connection...');

    // Create DB instance with retry logic
    const db = await PgDatabase.create(DATABASE_URL);
    _dbRef = db;

    // Check DB readiness
    try {
        await db.prepare('SELECT 1').get();
        logger.info("[BOOT] DB connected and ready");
    } catch (e) {
        logger.warn("[BOOT] Database currently unavailable...");
    }

    // Attach schema
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

    // Create Express app
    const app = await createApp(db);
    logger.info("[BOOT] App initialized");

    // EVM Wallet Validation (log-only, non-blocking)
    const evmKey = process.env.EVM_PRIVATE_KEY;
    if (!evmKey || evmKey === 'YOUR_PRIVATE_KEY_HERE') {
        console.warn('[BOOT] EVM_PRIVATE_KEY is not set or is a placeholder. Real EVM settlement will fail.');
    } else if (!/^(0x)?[0-9a-fA-F]{64}$/.test(evmKey)) {
        console.warn('[BOOT] EVM_PRIVATE_KEY is invalid (expected 64 hex chars). Settlement will fail.');
    } else {
        console.log('[BOOT] EVM_PRIVATE_KEY validated (length OK, hex format OK)');
    }

    // Settlement mode logging
    if (String(process.env.FEATURE_REAL_SETTLEMENT).trim().toLowerCase() !== "true") {
        console.log('REAL SETTLEMENT: INACTIVE');
    } else {
        console.log('REAL SETTLEMENT: ACTIVE');
    }

    console.log("[BOOT] Bootstrap complete");
    return { app, db };
}

// PART 3: Start background tasks (fire-and-forget, non-blocking)
function startBackgroundTasks(db) {
    // Deposit detector
    try {
        const depositDetector = new DepositDetector(db);
        depositDetector.start().catch(e =>
            console.error("[BOOT] DepositDetector async error:", e.message, "(non-fatal)")
        );
    } catch (e) {
        console.warn("[BOOT] DepositDetector failed to start:", e.message, "(non-fatal, settlement queue still operational)");
    }

    // Self test
    runSatelinkSelfTest(db).catch(e =>
        console.error("[BOOT] Self test failed:", e.message, "(non-fatal)")
    );

    // Epoch scheduler
    try {
        startEpochScheduler(db);
    } catch (e) {
        console.error("[BOOT] Failed to start Epoch Scheduler:", e.message);
    }
}

// Boot the server (skip under test/Mocha)
if (process.env.NODE_ENV !== "test" && !process.env.MOCHA) {
    try {
        const { app, db } = await bootstrap();
        const PORT = process.env.PORT || 8080;

        _serverRef = app.listen(PORT, "0.0.0.0", () => {
            console.log(`[BOOT] Server listening on port ${PORT}`);
            logger.info(`Satelink Backend Running`, { port: PORT, mode: process.env.NODE_ENV, db: "postgres" });
            console.log("Database Adapter: PostgreSQL (production mode)");
            console.log('REAL DEMAND STATUS: ACTIVE');

            // Fire background tasks AFTER server is listening
            startBackgroundTasks(db);
        });
    } catch (e) {
        console.error("═══════════════════════════════════════════════════════");
        console.error("  BOOT FAILURE — DATABASE CONNECTION FAILED");
        console.error("═══════════════════════════════════════════════════════");
        console.error(`  URL: ${maskUrl(RESOLVED_DB_URL)}`);
        console.error(`  Error: ${e.message}`);
        console.error("");
        console.error("  Troubleshooting:");
        console.error("  -- Docker mode: docker compose up -d database");
        console.error("  -- Local dev: ensure PostgreSQL is running on port 5432");
        console.error("  -- Credentials: check .env.local (user=satelink, pass=satelinkpass)");
        console.error("  -- IPv6 issue: use 127.0.0.1 instead of localhost");
        console.error("═══════════════════════════════════════════════════════");
        logger.error("Fatal: Could not start server", { error: e.message });
        process.exit(1);
    }
}
