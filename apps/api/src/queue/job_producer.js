import { JobQueue } from './job_queue.js';
import { QueueBackpressure } from './queue_backpressure.js';
import { logger } from '../monitoring/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class JobProducer {
    /**
     * @param {Object} db - PostgreSQL/UniversalDB instance
     */
    constructor(db) {
        this.db = db;
    }

    /**
     * Unified entry point for all job submissions.
     * 
     * @param {Object} params
     * @param {string} params.type - job_type (rpc_request, ai_inference, etc)
     * @param {string} params.client_id - identifies the caller
     * @param {Object} params.payload - the actual workload
     * @param {number} params.reward - estimated reward in USDT
     * @param {string} [params.priority=NORMAL] - CRITICAL|HIGH|NORMAL|LOW
     * @returns {Promise<{ ok: boolean, job_id?: string, status: string, error?: string, code?: number }>}
     */
    async produce(params) {
        const { type, client_id, payload, reward, priority = 'NORMAL' } = params;

        // 1. Validation
        if (!type || !payload || reward === undefined) {
            return { ok: false, error: 'Missing required fields (type, payload, reward)', code: 400 };
        }

        const job = {
            id: uuidv4(),
            type,
            client_id: client_id || 'anonymous',
            payload,
            reward: Number(reward),
            priority: priority.toUpperCase(),
            created_at: Date.now()
        };

        try {
            // 2. Rate Limiting & Backpressure
            const evaluation = await QueueBackpressure.evaluate(job);
            if (!evaluation.allowed) {
                return { ok: false, error: evaluation.reason, code: evaluation.status };
            }

            // 3. PostgreSQL Metadata Logging
            if (this.db) {
                try {
                    await this.db.prepare(`
                        INSERT INTO job_queue_log (job_id, client_id, job_type, payload, priority, reward, status, route, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run([
                        job.id,
                        job.client_id,
                        job.type,
                        JSON.stringify(job.payload),
                        job.priority,
                        job.reward,
                        'QUEUED',
                        evaluation.route || 'INTERNAL',
                        job.created_at
                    ]);
                } catch (dbErr) {
                    logger.error({ error: dbErr.message, job_id: job.id }, 'Producer metadata logging failed');
                    // Non-blocking for the stream write
                }
            }

            // 4. Adaptive Routing
            if (evaluation.route === 'EXTERNAL') {
                logger.info({ job_id: job.id, type, route: 'EXTERNAL' }, 'job_routed_external');
                return {
                    ok: true,
                    job_id: job.id,
                    status: 'routed_external',
                    message: 'Job accepted and routed to external provider failsafe'
                };
            }

            // 5. Redis Stream Enqueue
            await JobQueue.enqueue(job);

            logger.info({
                job_id: job.id,
                type,
                client_id: job.client_id,
                priority: job.priority
            }, 'job_enqueued');

            return {
                ok: true,
                job_id: job.id,
                status: 'queued',
                pricing_multiplier: QueueBackpressure.getPricingMultiplier(await JobQueue.getLength())
            };

        } catch (error) {
            logger.error({ error: error.message, job_id: job.id }, 'Job production failed');
            return { ok: false, error: 'Internal Queue Error', code: 500 };
        }
    }
}
