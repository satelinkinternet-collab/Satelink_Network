import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./src/monitoring/logger.js";
import Database from "better-sqlite3";
import { DepositDetector } from "./src/settlement/deposit_detector.js";
import { startWorkerProcessor } from "./src/queue/workerProcessor.js";
// Note: Depending on further extraction, you can import workload engines here to run them offline.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.cwd() !== __dirname) {
    logger.warn(`⚠️ Not running from project root. Adjusting from ${process.cwd()} ...`);
    process.chdir(__dirname);
}

const db = new Database(process.env.SQLITE_PATH || "satelink.db");

logger.info("🚀 Satelink Node Worker Starting...", { mode: process.env.NODE_ENV, db: process.env.DB_TYPE });

// Start any dedicated background tasks here.
// For example, the DepositDetector which watches chain events.
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
setInterval(() => {
    const mem = process.memoryUsage();
    logger.info({
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        uptime: process.uptime()
    }, "Worker Heartbeat");
}, heartbeatInterval);
