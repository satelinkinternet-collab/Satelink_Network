import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./src/monitoring/logger.js";
import { getValidatedDB } from "./src/core/db/index.js";
import { DepositDetector } from "./src/settlement/deposit_detector.js";
import { startWorkerProcessor } from "./src/queue/workerProcessor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.cwd() !== __dirname) {
    logger.warn(`⚠️ Not running from project root. Adjusting from ${process.cwd()} ...`);
    process.chdir(__dirname);
}

// Use UniversalDB: PostgreSQL when DATABASE_URL is set, SQLite otherwise
const db = getValidatedDB({
    sqlitePath: process.env.SQLITE_PATH || "satelink.db"
});
await db.init();

logger.info("🚀 Satelink Node Worker Starting...", { mode: process.env.NODE_ENV, db: db.type });

// Start any dedicated background tasks here.
if (process.env.FEATURE_REAL_SETTLEMENT === 'true') {
    try {
        const detector = new DepositDetector(db);
        await detector.start();
        logger.info("Deposit Detector activated natively on-chain");
    } catch (e) {
        logger.error("Failed to start Deposit Detector", { error: e.message });
    }
} else {
    logger.info("Simulated mode - specific chain watchers idle.");
}

import { JobConsumer } from "./src/queue/job_consumer.js";
import { JobQueue } from "./src/queue/job_queue.js";

// Ensure consumer groups exist
await JobQueue.initGroups();

const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY) || 5;
const consumer = new JobConsumer({ concurrency: workerConcurrency });
await consumer.start();

// Keep the worker process alive and report periodic heartbeat metrics
const heartbeatInterval = parseInt(process.env.WORKER_INTERVAL_MS) || 60000;
const heartbeatTimer = setInterval(() => {
    const mem = process.memoryUsage();
    logger.info({
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        uptime: process.uptime()
    }, "Worker Heartbeat");
}, heartbeatInterval);

// ── Graceful Shutdown ──
let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received — worker shutting down gracefully`);

    // 1. Stop heartbeat
    clearInterval(heartbeatTimer);

    // 2. Stop consuming new jobs (drain in-flight)
    try {
        await consumer.stop();
        logger.info("Job consumer stopped");
    } catch (e) {
        logger.error("Error stopping job consumer", { error: e.message });
    }

    // 3. Allow in-flight jobs to complete (max 5s)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Close database connection
    try {
        db.close();
        logger.info("Database connection closed");
    } catch (e) {
        logger.error("Error closing database", { error: e.message });
    }

    logger.info("Worker shutdown complete");
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
