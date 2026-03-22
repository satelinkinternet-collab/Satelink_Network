import { JobQueue } from './job_queue.js';
import { logger } from '../monitoring/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class JobConsumer {
    constructor(opts = {}) {
        this.consumerName = opts.consumerName || `worker-${uuidv4().split('-')[0]}`;
        this.concurrency = opts.concurrency || 5;
        this.running = false;
        this.opsEngine = opts.opsEngine;
        this.db = opts.db;
        this.visibilityTimeout = opts.visibilityTimeout || 30000;
    }

    async start() {
        if (this.running) return;
        this.running = true;
        logger.info({
            consumer: this.consumerName,
            concurrency: this.concurrency
        }, 'Job Consumer started');

        await JobQueue.initGroups();

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
            const result = await this._executeWorkload(job);

            let revenueRecorded = false;
            if (this.opsEngine) {
                const revenueResult = await this.opsEngine.executeOp({
                    op_type: job.job_type || 'ai_inference',
                    client_id: job.client_id,
                    node_id: result?.node_id || this.consumerName,
                    amount_usdt: job.reward_usdt || job.reward,
                    request_id: job.job_id,
                    timestamp: startTime,
                    payload_hash: job.job_id
                });
                revenueRecorded = revenueResult?.ok !== false;
            } else {
                revenueRecorded = true;
            }

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
            this.executionRouter = new ExecutionRouter(this.db);
        }
        return await this.executionRouter.routeExecution(job);
    }

    async _handleFailure(job, reason) {
        await JobQueue.moveToDLQ(job, reason);
    }
}
