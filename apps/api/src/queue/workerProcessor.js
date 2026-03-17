import { Worker } from 'bullmq';
import { connection } from './redisClient.js';
import { WORKLOAD_QUEUE_NAME } from './workloadQueue.js';
import { logger } from '../monitoring/logger.js';

/**
 * Creates and starts a BullMQ Worker instance handling
 * the execution of workloads and emitting lifecycle logs.
 *
 * @param {number} concurrency - Max concurrent jobs per worker instance.
 * @returns {Worker}
 */
export function startWorkerProcessor(concurrency = 5) {
    const worker = new Worker(WORKLOAD_QUEUE_NAME, async (job) => {
        logger.info({ jobId: job.id, op_type: job.data.op_type }, "job_claimed");

        // Simulate Workload Execution (Replace eventually with real executor interface)
        // 60-second simulated max timeout limit (by throwing error or timing out natively)

        // Simulate generic work processing duration
        const executionDuration = Math.floor(Math.random() * 2000) + 500;

        await new Promise((resolve) => setTimeout(resolve, executionDuration));

        // Force occasional failure for testing backoff during smoke test (optional logic trap)
        if (job.data.force_fail) {
            throw new Error("Simulated Workload Processing Failure");
        }

        // Append output or results
        return { success: true, processedIn: executionDuration };
    }, {
        connection,
        concurrency,
        limiter: {
            max: 50, // Backpressure protection (max jobs per duration)
            duration: 1000
        }
    });

    // Track the lifecycle via strictly formatted PINO logs
    worker.on('completed', (job, returnvalue) => {
        logger.info({ jobId: job.id, result: returnvalue }, "job_completed");
    });

    worker.on('failed', (job, error) => {
        logger.error({ jobId: job.id, err: error.message, attempts: job.attemptsMade }, "job_failed");
    });

    worker.on('ready', () => {
        logger.info({ concurrency }, "[WorkerProcessor] BullMQ worker is ready and polling");
    });

    return worker;
}
