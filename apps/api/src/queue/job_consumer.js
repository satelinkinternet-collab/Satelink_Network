import { JobQueue } from './job_queue.js';
import { logger } from '../monitoring/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionRouter } from '../execution/executionRouter.js';

export class JobConsumer {
    constructor(opts = {}) {
        this.consumerName = opts.consumerName || `worker-${uuidv4().split('-')[0]}`;
        this.concurrency = opts.concurrency || 5;
        this.running = false;
        this.opsEngine = opts.opsEngine;
        this.executionRouter = new ExecutionRouter(opts.db || opts.opsEngine?.db);
        this.visibilityTimeout = opts.visibilityTimeout || 30000; // 30s
    }

    async start() {
        if (this.running) return;
        this.running = true;
        logger.info({
            consumer: this.consumerName,
            concurrency: this.concurrency
        }, 'Job Consumer started');

        // Initialize groups once
        await JobQueue.initGroups();

        // Start multiple worker loops based on concurrency
        for (let i = 0; i < this.concurrency; i++) {
            this._runLoop(i);
        }
    }

    async stop() {
        this.running = false;
        logger.info({ consumer: this.consumerName }, 'Job Consumer stopping');
    }

    async _runLoop(workerId) {
        while (this.running) {
            try {
                const jobs = await JobQueue.pullNext(this.consumerName, 1);

                if (jobs.length === 0) {
                    // Backoff slightly if no jobs
                    await new Promise(r => setTimeout(r, 500));
                    continue;
                }

                for (const job of jobs) {
                    await this._processJob(job);
                }
            } catch (error) {
                logger.error({ error: error.message, workerId }, 'Worker loop error');
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    async _processJob(job) {
        const startTime = Date.now();
        logger.info({
            job_id: job.job_id,
            type: job.job_type,
            priority: job.priority
        }, 'job_claimed');

        try {
            // 1. Simulate/Execute Workflow
            // In a real system, this would call a router or specific executor
            const result = await this._executeWorkload(job);

            // TASK 2 — RECORD EXECUTION RESULT
            if (result && result.success) {
                const db = this.opsEngine?.db || this.executionRouter?.db;
                if (db && typeof db.recordExecution === 'function') {
                    await db.recordExecution({
                        job_id: job.job_id || job.id,
                        revenue: result.revenue || 0,
                        cost: result.cost || 0
                    });
                }
            }

            // 2. Integration with OpsEngine (Revenue/Accounting)
            if (this.opsEngine) {
                await this.global.opsEngine.executeOp({
                    op_type: job.job_type,
                    node_id: this.consumerName,
                    client_id: job.client_id,
                    request_id: job.job_id,
                    timestamp: Date.now(),
                    payload_hash: job.payload_hash || '0x'
                });
            }

            // 3. Acknowledge and Remove from Stream
            await JobQueue.acknowledge(job.sourceStream, job.streamId);

            logger.info({
                job_id: job.job_id,
                duration: Date.now() - startTime
            }, 'job_completed');

        } catch (error) {
            logger.error({
                job_id: job.job_id,
                error: error.message
            }, 'job_execution_failed');

            // Handle Retries / DLQ
            await this._handleFailure(job, error.message);
        }
    }

    async _executeWorkload(job) {
        if (!this.executionRouter) {
            const { ExecutionRouter } = await import('../execution/executionRouter.js');
            const { getValidatedDB } = await import('../../src/core/db/index.js');
            const db = getValidatedDB();
            await db.init();
            this.executionRouter = new ExecutionRouter(db);
        }

        const result = await this.executionRouter.routeExecution(job);

        if (job.payload?.force_fail) {
            throw new Error('Simulated execution failure');
        }

        return result;
    }

    async _handleFailure(job, reason) {
        // Basic retry logic: if x-delivery-count > 5, move to DLQ
        // For simplicity in this demo, we'll check a simulated counter or move immediately for fatal errors
        // In production, we'd use XPENDING to check delivery counts

        // Let's assume for this implementation we move to DLQ immediately if requested or after a threshold
        await JobQueue.moveToDLQ(job, reason);
    }
}
