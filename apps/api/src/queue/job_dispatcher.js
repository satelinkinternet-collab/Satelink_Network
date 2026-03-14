import { JobQueue } from './job_queue.js';
import { logger } from '../monitoring/logger.js';
import crypto from 'crypto';

const JOB_SIGNING_SECRET = process.env.JOB_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');
const DEFAULT_TIMEOUT_MS = parseInt(process.env.DISPATCH_TIMEOUT_MS || '30000', 10);
const MAX_RETRIES = 5;

/**
 * JobDispatcher coordinates job execution with real HTTP dispatch to node agents.
 * Retry state is persisted in the database (job_retries table).
 */
export class JobDispatcher {
    constructor({ capacityManager, scheduler, db }) {
        this.capacityManager = capacityManager;
        this.scheduler = scheduler;
        this.db = db;
        this.running = false;

        this._ensureRetryTable();
    }

    _ensureRetryTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS job_retries (
                    job_id TEXT PRIMARY KEY,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    last_retry_at INTEGER NOT NULL,
                    last_node TEXT
                )
            `).run();
        } catch (e) {
            logger.warn({ err: e.message }, 'Could not create job_retries table');
        }
    }

    _getRetryCount(jobId) {
        try {
            const row = this.db.prepare('SELECT retry_count, last_node FROM job_retries WHERE job_id = ?').get(jobId);
            return row || { retry_count: 0, last_node: null };
        } catch {
            return { retry_count: 0, last_node: null };
        }
    }

    _incrementRetry(jobId, nodeId) {
        try {
            this.db.prepare(`
                INSERT INTO job_retries (job_id, retry_count, last_retry_at, last_node)
                VALUES (?, 1, ?, ?)
                ON CONFLICT(job_id) DO UPDATE SET
                    retry_count = retry_count + 1,
                    last_retry_at = excluded.last_retry_at,
                    last_node = excluded.last_node
            `).run(jobId, Date.now(), nodeId);
        } catch (e) {
            logger.warn({ err: e.message }, 'Failed to increment retry count');
        }
    }

    _clearRetry(jobId) {
        try {
            this.db.prepare('DELETE FROM job_retries WHERE job_id = ?').run(jobId);
        } catch { /* ignore */ }
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
            const jobs = await JobQueue.pullNext(5);

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

        const retryInfo = this._getRetryCount(job.job_id);
        const node = await this.scheduler.selectNode(job, retryInfo);

        if (!node) {
            logger.warn({ job_id: job.job_id }, 'No capacity found for job, re-queueing');
            return;
        }

        try {
            await this.capacityManager.incrementActiveJobs(node.node_id);

            // Real HTTP dispatch to node agent /execute endpoint
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

    /**
     * Dispatches job to node via HTTP POST to node.api_endpoint/execute
     * - Sends JSON payload (job_id, type, payload, reward, timeout_ms)
     * - Signs request with HMAC in X-Job-Signature header
     * - Enforces timeout via AbortController
     */
    async dispatchToNode(node, job) {
        const endpoint = `${node.api_endpoint}/execute`;
        const timeout_ms = job.timeout_ms || DEFAULT_TIMEOUT_MS;

        const body = {
            job_id: job.job_id,
            type: job.job_type,
            payload: job.payload || {},
            reward: parseFloat(job.reward_usdt) || 0,
            timeout_ms
        };

        // HMAC signature for job verification
        const hmac = crypto.createHmac('sha256', JOB_SIGNING_SECRET);
        hmac.update(JSON.stringify(body));
        const signature = hmac.digest('hex');

        // AbortController for timeout enforcement
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout_ms);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Job-Signature': signature
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errBody.error || `Node returned ${response.status}`
                };
            }

            const data = await response.json();

            // Validate response structure
            if (data.status !== 'accepted') {
                return { success: false, error: data.error || 'Node rejected job' };
            }

            return {
                success: true,
                execution_id: data.execution_id,
                revenue: parseFloat(job.reward_usdt) || 0,
                duration_ms: data.duration_ms || 0
            };
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                return { success: false, error: 'dispatch_timeout' };
            }
            return { success: false, error: err.message };
        }
    }

    async finalizeJob(job, node, result) {
        logger.info({ job_id: job.job_id, node_id: node.node_id, execution_id: result.execution_id }, 'job_completed');

        // Record revenue event
        try {
            this.db.prepare(`
                INSERT INTO revenue_events (amount, token, source, created_at)
                VALUES (?, ?, ?, ?)
            `).run(result.revenue, 'USDT', `job:${job.job_id}`, Date.now());
        } catch (e) {
            logger.error({ err: e.message }, 'Failed to record revenue event');
        }

        await JobQueue.acknowledge(job.streamId);
        this._clearRetry(job.job_id);
    }

    async handleFailure(job, node, error) {
        const retryInfo = this._getRetryCount(job.job_id);
        this._incrementRetry(job.job_id, node.node_id);

        const attempts = retryInfo.retry_count + 1;

        logger.error({
            job_id: job.job_id,
            node_id: node.node_id,
            attempt: attempts,
            error
        }, 'job_failed');

        if (attempts < MAX_RETRIES) {
            // Exponential backoff: delay = 1000ms * 2^retries
            const backoffMs = 1000 * Math.pow(2, attempts);
            logger.info({ job_id: job.job_id, attempt: attempts, backoff_ms: backoffMs }, 'Retrying job with backoff');
            setTimeout(() => this.processJob(job), backoffMs);
        } else {
            logger.error({ job_id: job.job_id }, `Job failed permanently after ${MAX_RETRIES} retries, moving to DLQ`);
            await JobQueue.acknowledge(job.streamId);
            this._clearRetry(job.job_id);

            try {
                this.db.prepare('UPDATE job_queue_log SET status = "FAILED" WHERE job_id = ?').run(job.job_id);
            } catch { /* ignore */ }
        }
    }
}
