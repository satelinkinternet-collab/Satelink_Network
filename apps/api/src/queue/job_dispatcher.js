import { JobQueue } from './job_queue.js';
import { logger } from '../monitoring/logger.js';

/**
 * JobDispatcher is the background worker that coordinates job execution and retries.
 */
export class JobDispatcher {
    constructor({ capacityManager, scheduler, db }) {
        this.capacityManager = capacityManager;
        this.scheduler = scheduler;
        this.db = db;
        this.running = false;
        this.retryMap = new Map(); // job_id -> { attempts: 0, lastNode: null }
    }

    async start() {
        if (this.running) return;
        this.running = true;
        logger.info('[JobDispatcher] Started background worker loop');
        this.loop();
    }

    async stop() {
        this.running = false;
        logger.info('[JobDispatcher] Stopping background worker loop');
    }

    async loop() {
        while (this.running) {
            const jobs = await JobQueue.pullNext(5); // Pull small batch

            if (jobs.length === 0) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            for (const job of jobs) {
                await this.processJob(job);
            }
        }
    }

    async processJob(job) {
        logger.info({ job_id: job.job_id, type: job.job_type }, 'job_claimed');

        const retryInfo = this.retryMap.get(job.job_id);
        const node = await this.scheduler.selectNode(job, retryInfo);

        if (!node) {
            logger.warn({ job_id: job.job_id }, 'No capacity found for job, re-queueing or pausing');
            // In a real system, we might push back to queue or wait
            return;
        }

        try {
            await this.capacityManager.incrementActiveJobs(node.node_id);

            // Simulate dispatch to node API
            const result = await this.dispatchToNode(node, job);

            if (result.success) {
                await this.finalizeJob(job, node, result);
            } else {
                await this.handleFailure(job, node, result.error);
            }
        } catch (error) {
            await this.handleFailure(job, node, error.message);
        } finally {
            await this.capacityManager.decrementActiveJobs(node.node_id);
        }
    }

    async dispatchToNode(node, job) {
        // Placeholder for node-api call: POST /v1/node/execute
        // Simulated latency
        await new Promise(r => setTimeout(r, Math.random() * 500 + 100));

        if (Math.random() < 0.1) return { success: false, error: 'Node timeout' };
        return { success: true, revenue: parseFloat(job.reward_usdt) };
    }

    async finalizeJob(job, node, result) {
        logger.info({ job_id: job.job_id, node_id: node.node_id }, 'job_completed');

        // Record revenue event in Operations Engine
        // (Assuming OperationsEngine.recordRevenue or similar exists)
        try {
            await this.db.prepare(`
                INSERT INTO revenue_events (amount, token, source, created_at)
                VALUES (?, ?, ?, ?)
            `).run(result.revenue, 'USDT', `job:${job.job_id}`, Date.now());
        } catch (e) {
            logger.error({ err: e.message }, 'Failed to record revenue event');
        }

        await JobQueue.acknowledge(job.streamId);
        this.retryMap.delete(job.job_id);
    }

    async handleFailure(job, node, error) {
        const retryInfo = this.retryMap.get(job.job_id) || { attempts: 0, lastNode: null };
        retryInfo.attempts++;
        retryInfo.lastNode = node.node_id;

        logger.error({
            job_id: job.job_id,
            node_id: node.node_id,
            attempt: retryInfo.attempts,
            error
        }, 'job_failed');

        if (retryInfo.attempts < 3) {
            this.retryMap.set(job.job_id, retryInfo);
            // Re-queue or retry logic
            // Requirements:
            // 1st retry -> same node (default scheduler might pick different, so we force or influence)
            // 2nd retry -> different node
            // 3rd retry -> highest reputation node

            logger.info({ job_id: job.job_id, attempt: retryInfo.attempts }, 'Retrying job');
            // For MVP, we just processJob again in next tick
            setTimeout(() => this.processJob(job), 1000);
        } else {
            logger.error({ job_id: job.job_id }, 'Job failed permanently after 3 retries');
            await JobQueue.acknowledge(job.streamId); // Remove from stream to stop stuck jobs
            this.retryMap.delete(job.job_id);

            // Mark FAILED in DB log if log table exists
            try {
                await this.db.prepare('UPDATE job_queue_log SET status = "FAILED" WHERE job_id = ?').run(job.job_id);
            } catch (e) { }
        }
    }
}
