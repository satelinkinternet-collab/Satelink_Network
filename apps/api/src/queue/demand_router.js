/**
 * Demand Router (Module 3)
 *
 * The demand router sits between the WorkloadAcquisitionEngine and the
 * existing execution pipeline.
 *
 * Flow:
 *   WorkloadAcquisitionEngine
 *       ↓  flush()
 *   DemandRouter.dispatch()
 *       ↓  push_job()
 *   JobQueue (or in-memory fallback)
 *       ↓
 *   JobScheduler → ExecutionRouter → Nodes
 *
 * The router does NOT touch existing engines — it only calls their public
 * push_job() / dispatchOperation() interfaces.
 *
 * It also updates DemandMetrics after each dispatch.
 *
 * Auto-drain mode:
 *   Call start() to continuously flush the buffer every DRAIN_INTERVAL_MS.
 *   Call stop() to halt the loop.
 */

import crypto from 'crypto';

export class DemandRouter {
    static DRAIN_INTERVAL_MS = 500;   // how often to flush the buffer

    /**
     * @param {import('./workload_acquisition_engine.js').WorkloadAcquisitionEngine} acquisitionEngine
     * @param {Object} pipeline          - object exposing push_job(job) async (e.g. JobQueue)
     * @param {import('./demand_metrics.js').DemandMetrics} metrics
     */
    constructor(acquisitionEngine, pipeline, metrics) {
        this.engine = acquisitionEngine;
        this.pipeline = pipeline;
        this.metrics = metrics;
        this._running = false;
        this._timer = null;
    }

    // ─── Auto-drain loop ─────────────────────────────────────────────────────

    start() {
        if (this._running) return;
        this._running = true;
        this._scheduleDrain();
        console.log('[DemandRouter] Started.');
    }

    stop() {
        this._running = false;
        if (this._timer) clearTimeout(this._timer);
        console.log('[DemandRouter] Stopped.');
    }

    // ─── Manual dispatch ─────────────────────────────────────────────────────

    /**
     * Flush pending workloads from the acquisition engine and push them
     * into the execution pipeline.
     *
     * @param {number} [limit]  - max workloads to drain per call
     * @returns {Promise<{ dispatched: number, errors: number }>}
     */
    async dispatch(limit = 50) {
        const workloads = this.engine.flush(limit);
        let dispatched = 0;
        let errors = 0;

        for (const workload of workloads) {
            try {
                await this._pushToPipeline(workload);
                this.metrics.recordServed();
                dispatched++;
            } catch (err) {
                console.error('[DemandRouter] dispatch error:', err.message);
                this.metrics.recordUnserved();
                errors++;
            }
        }

        return { dispatched, errors };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    async _pushToPipeline(workload) {
        const job = this._toJob(workload);
        await this.pipeline.push_job(job);
    }

    /**
     * Convert normalised workload into the internal job format expected by JobQueue.
     */
    _toJob(workload) {
        return {
            id: `demand_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            type: workload.op_type,
            chain: workload.target === 'generic' ? null : workload.target,
            reward: workload.reward,
            payload: workload.payload,
            priority: this._derivePriority(workload.op_type),
            client_id: 'demand_engine',
            is_universal_op: true,
            is_demand_job: true       // flag for downstream telemetry
        };
    }

    /** Map workload type to job priority tier. */
    _derivePriority(op_type) {
        if (op_type === 'ai_inference') return 'enterprise';
        if (op_type === 'rpc_call') return 'developer';
        return 'free';
    }

    _scheduleDrain() {
        if (!this._running) return;
        this._timer = setTimeout(async () => {
            try {
                const result = await this.dispatch(50);
                if (result.dispatched > 0) {
                    console.log(`[DemandRouter] Dispatched ${result.dispatched} workload(s).`);
                }
            } catch (e) {
                console.error('[DemandRouter] Drain error:', e.message);
            }
            this._scheduleDrain();
        }, DemandRouter.DRAIN_INTERVAL_MS);
    }
}
