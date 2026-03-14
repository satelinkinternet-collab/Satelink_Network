import { JobQueue } from '../queue/job_queue.js';
import { ProfitabilityEngine } from '../economics/profitability_engine.js';
import { PricingEngine } from '../economics/pricing_engine.js';
import { ExecutionRouter } from '../execution/executionRouter.js';
import { OperationsEngine } from '../core/operations_engine.js';
import { JobMatchingEngine } from './job_matching_engine.js';
import { JobEscrow } from '../settlement/job_escrow.js';
import crypto from 'crypto';

export class JobScheduler {
    constructor(db) {
        this.db = db;
        this.queue = new JobQueue();
        this.profitability = new ProfitabilityEngine();
        this.pricing = new PricingEngine(db);
        this.router = new ExecutionRouter(db);
        this.opsEngine = new OperationsEngine(db, null, null);
        this.matchingEngine = new JobMatchingEngine(db);
        this.escrow = new JobEscrow(db, this.opsEngine);

        this.isRunning = false;
        this.pollIntervalMs = 1000;
        this.maxRetries = 3;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._loop();
        console.log("[Scheduler] Started.");
    }

    stop() {
        this.isRunning = false;
        console.log("[Scheduler] Stopped.");
    }

    async _getSystemLoad() {
        // Mock method to get current load %, perhaps from the number of active jobs or Redis depth
        return 65;
    }

    async _checkNodeCapacity(nodeId) {
        // Query the node's current load
        // Stub implementation, would realistically check real-time metrics
        try {
            const row = this.db.prepare("SELECT current_load FROM node_metrics WHERE node_id = ?").get([nodeId]);
            return row ? row.current_load : 0;
        } catch (e) {
            return 50; // default safe load if table not ready
        }
    }

    async _loop() {
        while (this.isRunning) {
            try {
                const job = await this.queue.pop_job();
                if (!job) {
                    await new Promise(r => setTimeout(r, this.pollIntervalMs));
                    continue;
                }

                await this.processJob(job);
            } catch (error) {
                console.error("[Scheduler Error]", error.message);
                await new Promise(r => setTimeout(r, this.pollIntervalMs));
            }
        }
    }

    async processJob(job) {
        // 1. Profitability Check
        const load = await this._getSystemLoad();
        const multiplier = this.pricing.getDynamicMultiplier(load);

        // Let's assume the job has a flat .reward attached to it from the user's submission,
        // or we determine it based on the pricing engine. Let's use the DB pricing.
        const basePrice = this.pricing.getAdjustedPrice(job.type, load) || 0.005; // fallback
        job.reward = basePrice;

        const profitCheck = this.profitability.evaluateProfitability(job, multiplier);

        if (!profitCheck.isProfitable) {
            console.warn(`[Scheduler] Job ${job.id} rejected. Unprofitable (Profit: ${profitCheck.projectedProfit})`);
            return { status: 'rejected_unprofitable' };
        }

        // 2. Select Execution Source
        let node;
        try {
            if (job.is_marketplace) {
                // PART 4 & 5: Pass the job to the generic capability Matcher
                node = this.matchingEngine.findCapableNode(job);
                if (!node) throw new Error("No capable node currently matches");
                node.id = node.wallet || node.id; // align format

                // Part 6 Status Update Tracking
                try {
                    this.db.prepare(`UPDATE marketplace_jobs SET status = 'executing' WHERE job_id = ?`).run(job.id);
                } catch (e) { }
            } else {
                node = await this.router.selectExecutionSource(job.chain || 'ethereum', job.payload);
                if (job.is_universal_op) {
                    try {
                        this.db.prepare(`UPDATE ops_registry SET status = 'executing' WHERE op_id = ?`).run(job.id);
                    } catch (e) { }
                }
            }
        } catch (e) {
            // Requeue if we just temporarily lack capacity
            return this._handleFailure(job, 'No target node available');
        }

        // 3. Capacity Protection
        const nodeLoad = await this._checkNodeCapacity(node.id);
        if (nodeLoad > 80) {
            console.warn(`[Scheduler] Node ${node.id} overloaded (${nodeLoad}%). Requeuing job ${job.id}.`);
            return this._handleFailure(job, 'Node at capacity');
        }

        // 4. Dispatch Job
        const startTime = Date.now();
        const dispatchResult = await this._dispatch(job, node);

        if (!dispatchResult.success) {
            return this._handleFailure(job, 'Execution failed on node');
        }

        // 5. Record Revenue Event
        const executionTime = Date.now() - startTime;
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(job)).digest('hex');

        try {
            await this.opsEngine.executeOp({
                op_type: job.type,
                node_id: node.id,
                client_id: job.client_id || 'scheduler_client',
                request_id: job.id,
                timestamp: Date.now(),
                payload_hash: payloadHash
            });
            console.log(`[Scheduler] Job ${job.id} executed successfully. Revenue recorded.`);

            // Infrastructure Marketplace Post-Execution Settlement (Part 5 Integration)
            if (job.is_marketplace) {
                await this.escrow.releaseFunds(job.id, node.id);
                try {
                    this.db.prepare(`UPDATE marketplace_jobs SET status = 'completed' WHERE job_id = ?`).run(job.id);
                } catch (e) { }
            }

            // Universal Ops Check
            if (job.is_universal_op) {
                try {
                    this.db.prepare(`UPDATE ops_registry SET status = 'completed' WHERE op_id = ?`).run(job.id);
                    this.db.prepare(`UPDATE universal_ops_metrics SET operations_executed = operations_executed + 1, revenue_generated = revenue_generated + ? WHERE id = 1`).run(job.reward);
                } catch (e) { }
            }
        } catch (e) {
            console.error(`[Scheduler] Failed to record revenue for job ${job.id}`, e.message);
        }

        return { status: 'success', profit: profitCheck.projectedProfit, executionTime };
    }

    async _dispatch(job, node) {
        const endpoint = node.api_endpoint || node.endpoint;
        if (!endpoint) {
            return { success: false, error: 'Node has no api_endpoint' };
        }

        const timeout_ms = job.timeout_ms || 30000;
        const body = {
            job_id: job.id,
            type: job.type,
            payload: job.payload || {},
            reward: job.reward || 0,
            timeout_ms
        };

        // HMAC signature for node verification
        const hmac = crypto.createHmac('sha256', process.env.JOB_SIGNING_SECRET || 'dev-signing-key');
        hmac.update(JSON.stringify(body));
        const signature = hmac.digest('hex');

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout_ms);

        try {
            const response = await fetch(`${endpoint}/execute`, {
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
                return { success: false, error: `Node returned ${response.status}` };
            }

            const data = await response.json();
            return { success: data.status === 'accepted', execution_id: data.execution_id };
        } catch (err) {
            clearTimeout(timer);
            return { success: false, error: err.name === 'AbortError' ? 'dispatch_timeout' : err.message };
        }
    }

    async _handleFailure(job, reason) {
        const retries = job.retries || 0;
        if (retries < this.maxRetries) {
            job.retries = retries + 1;
            await this.queue.retry_job(job);
            return { status: 'retried', reason };
        } else {
            console.error(`[Scheduler] Job ${job.id} max retries exceeded. Dropping. Reason: ${reason}`);
            if (job.is_marketplace) {
                this.escrow.refund(job.id);
                try {
                    this.db.prepare(`UPDATE marketplace_jobs SET status = 'failed' WHERE job_id = ?`).run(job.id);
                } catch (e) { }
            }
            if (job.is_universal_op) {
                try {
                    this.db.prepare(`UPDATE ops_registry SET status = 'failed' WHERE op_id = ?`).run(job.id);
                } catch (e) { }
            }
            return { status: 'failed_dropped', reason };
        }
    }
}
