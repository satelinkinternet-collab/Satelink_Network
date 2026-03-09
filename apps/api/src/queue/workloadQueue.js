import { Queue } from 'bullmq';
import { connection } from './redisClient.js';
import { logger } from '../monitoring/logger.js';

export const WORKLOAD_QUEUE_NAME = 'satelink-workloads';

/**
 * Main job queue for distributing workloads to Node Workers.
 */
export const workloadQueue = new Queue(WORKLOAD_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500,     // Keep last 500 failed jobs
    },
});

/**
 * Enqueue a normalized workload for processing.
 *
 * @param {Object} payload - The normalized workload payload
 * @returns {Promise<import('bullmq').Job>}
 */
export async function enqueueWorkload(payload) {
    const job = await workloadQueue.add('execute-workload', payload);
    logger.info({ jobId: job.id, op_type: payload.op_type }, "job_enqueued");
    return job;
}

/**
 * Retrieves instantaneous metrics regarding the queue.
 */
export async function getQueueMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        workloadQueue.getWaitingCount(),
        workloadQueue.getActiveCount(),
        workloadQueue.getCompletedCount(),
        workloadQueue.getFailedCount(),
        workloadQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
}
