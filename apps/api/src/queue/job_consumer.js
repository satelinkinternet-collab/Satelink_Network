import { JobQueue } from './job_queue.js';
import { logger } from '../monitoring/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class JobConsumer {
    constructor(opts = {}) {
        this.consumerName = opts.consumerName || `worker-${uuidv4().split('-')[0]}`;
        this.concurrency = opts.concurrency || 5;
        this.running = false;
        this.opsEngine = opts.opsEngine;
        this.escrow = opts.escrow || null;
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
            // 1. Execute workload
            const result = await this._executeWorkload(job);

            // 2. Record revenue FIRST (before escrow release) to prevent double-spend
            let revenueRecorded = false;
            if (this.opsEngine) {
                const revenueResult = await this.opsEngine.execute({
                    job_id: job.job_id,
                    client_id: job.client_id,
                    node_id: this.consumerName,
                    amount_usdt: job.reward_usdt,
                    status: 'COMPLETED',
                    duration: Date.now() - startTime
                });
                revenueRecorded = revenueResult?.ok !== false;
            } else {
                revenueRecorded = true;
            }

            // 3. Only release escrow AFTER confirmed revenue recording
            if (revenueRecorded && this.escrow) {
                try {
                    await this.escrow.releaseFunds(job.job_id, this.consumerName);
                } catch (escrowErr) {
                    logger.error({ job_id: job.job_id, err: escrowErr.message }, 'Escrow release failed after revenue recorded');
                }
            } else if (!revenueRecorded) {
                logger.error({ job_id: job.job_id }, 'Revenue recording failed — escrow remains locked (refundable)');
            }

            // 4. Acknowledge and remove from stream
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

            await this._handleFailure(job, error.message);
        }
    }

    async _executeWorkload(job) {
        if (!this.executionRouter) {
            const { ExecutionRouter } = await import('../execution/executionRouter.js');
            const { getValidatedDB } = await import('../../src/core/db/index.js');
            const db = getValidatedDB({ sqlitePath: process.env.SQLITE_PATH || 'satelink.db' });
            await db.init();
            this.executionRouter = new ExecutionRouter(db);
        }

        return await this.executionRouter.routeExecution(job);
    }

    async _handleFailure(job, reason) {
        await JobQueue.moveToDLQ(job, reason);
    }
}
