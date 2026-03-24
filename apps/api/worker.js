import "./src/core/config/dotenv_boot.js";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./src/monitoring/logger.js";
import { PgDatabase } from "./src/database/pg_adapter.js";
import { DepositDetector } from "./src/settlement/deposit_detector.js";
import { WithdrawalProcessor } from "./src/settlement/withdrawal_processor.js";
import { JobQueue } from "./src/queue/job_queue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
    process.on('uncaughtException', (err) => {
        logger.error({ error: err.message, stack: err.stack }, 'Uncaught Exception');
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error({ reason, promise }, 'Unhandled Rejection');
    });

    if (process.cwd() !== __dirname && process.cwd() !== path.dirname(__dirname)) {
        logger.warn(`Not running from project root. Adjusting from ${process.cwd()} ...`);
    }

    console.log('-------------------------------------------');
    console.log('Satelink Node Worker Starting...');
    console.log('Database Adapter: PostgreSQL (production mode)');
    if (process.env.FEATURE_REAL_SETTLEMENT !== "true") {
        console.log('REAL SETTLEMENT: INACTIVE');
    } else {
        console.log('REAL SETTLEMENT: ACTIVE');
    }
    console.log('-------------------------------------------');

    try {
        const db = new PgDatabase();
        await db.init();
        logger.info("[BOOT] DB connected");

        const { attachSchema } = await import("./src/core/schema.js");
        await attachSchema(db);

        const { BackupService } = await import("./src/utils/backup_service.js");
        const backup = new BackupService(db);
        await backup.init();

        const depositDetector = new DepositDetector(db);
        try {
            await depositDetector.start();
        } catch (e) {
            logger.warn({ error: e.message }, "Failed to start Deposit Detector");
        }

        const withdrawalProcessor = new WithdrawalProcessor(db);
        withdrawalProcessor.start();

        logger.info("[BOOT] Modules initialized");

        await startWithRetry(db);

    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, "Failed to start Satelink Node Worker");
        process.exit(1);
    }
}

async function startWithRetry(db, maxRetries = 10, delayMs = 3000) {
    const { JobConsumer } = await import("./src/queue/job_consumer.js");
    const { OperationsEngine } = await import("./src/core/operations_engine.js");

    const opsEngine = new OperationsEngine(db, null, null);
    await opsEngine.init();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await JobQueue.initGroups();
            const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY) || 5;
            const consumer = new JobConsumer({
                concurrency: workerConcurrency,
                db: db,
                opsEngine: opsEngine
            });
            await consumer.start();
            logger.info("Worker queue consumer started successfully");
            return;
        } catch (error) {
            logger.error({
                attempt,
                error: error.message,
                nextRetryIn: `${delayMs}ms`
            }, "Failed to start JobConsumer, retrying...");

            if (attempt === maxRetries) {
                throw new Error(`Failed to start JobConsumer after ${maxRetries} attempts`);
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}

start();
