/**
 * Workload Acquisition Engine (Module 1)
 *
 * The central entry point for the demand layer.
 * Discovers and ingests workloads from four source families:
 *   - RPC networks
 *   - Webhook relays
 *   - AI inference relays
 *   - Automation triggers
 *
 * Each raw workload is normalised by the appropriate adapter into:
 *   { op_type, target, payload, reward }
 *
 * Normalised workloads are placed in the DemandBuffer.
 * Metrics are recorded for every acceptance / rejection event.
 *
 * Usage:
 *   const engine = new WorkloadAcquisitionEngine(db);
 *   engine.submit(rawPayload);          // from any source
 *   const workloads = engine.flush();   // drain buffer for DemandRouter
 */

import { RpcAdapter } from '../queue/adapters/rpc_adapter.js';
import { WebhookAdapter } from '../queue/adapters/webhook_adapter.js';
import { AiAdapter } from '../queue/adapters/ai_adapter.js';
import { AutomationAdapter } from '../queue/adapters/automation_adapter.js';
import { DemandBuffer } from '../queue/demand_buffer.js';
import { DemandMetrics } from '../monitoring/demand_metrics.js';

export class WorkloadAcquisitionEngine {
    constructor(db) {
        this.db = db;
        this.buffer = new DemandBuffer();
        this.metrics = new DemandMetrics(db);

        // Ordered adapter chain — first canHandle() match wins
        this._adapters = [
            { key: 'rpc', adapter: new RpcAdapter() },
            { key: 'ai', adapter: new AiAdapter() },
            { key: 'webhook', adapter: new WebhookAdapter() },
            { key: 'automation', adapter: new AutomationAdapter() }
        ];
    }

    /**
     * Submit a raw external workload for ingestion.
     * The engine auto-detects the correct adapter.
     *
     * @param {Object} raw        - raw payload from any external source
     * @param {string} [hint]     - optional adapter hint: 'rpc'|'ai'|'webhook'|'automation'
     * @returns {{ accepted: boolean, op_type?: string, reason?: string }}
     */
    submit(raw, hint = null) {
        this.metrics.recordIncoming();

        // 1. Select adapter
        let selected = null;
        if (hint) {
            selected = this._adapters.find(a => a.key === hint) || null;
        }
        if (!selected) {
            selected = this._adapters.find(a => a.adapter.canHandle(raw)) || null;
        }

        if (!selected) {
            this.metrics.recordUnserved();
            return { accepted: false, reason: 'no suitable adapter found for payload' };
        }

        // 2. Normalise
        let workload;
        try {
            workload = selected.adapter.normalise(raw);
        } catch (err) {
            this.metrics.recordUnserved();
            return { accepted: false, reason: err.message };
        }

        // 3. Buffer (includes safety checks — Module 6)
        const result = this.buffer.enqueue(workload, selected.key);
        if (!result.accepted) {
            this.metrics.recordUnserved();
            return { accepted: false, reason: result.reason };
        }

        return { accepted: true, op_type: workload.op_type };
    }

    /**
     * Submit a workload that is already in the normalised format.
     * Used by the Ops API integration (Module 7).
     *
     * @param {{ op_type, target, payload, reward }} workload
     * @param {string} [sourceKey]
     * @returns {{ accepted: boolean, reason?: string }}
     */
    submitNormalised(workload, sourceKey = 'ops_api') {
        this.metrics.recordIncoming();
        const result = this.buffer.enqueue(workload, sourceKey);
        if (!result.accepted) {
            this.metrics.recordUnserved();
        }
        return result;
    }

    /**
     * Drain the buffer and return pending workloads for the DemandRouter.
     *
     * @param {number} [limit]
     * @returns {Array<{ op_type, target, payload, reward }>}
     */
    flush(limit = 50) {
        return this.buffer.drain(limit);
    }

    /**
     * Current buffer depth (unprocessed workloads).
     */
    pendingCount() {
        return this.buffer.size();
    }

    /**
     * Expose metrics snapshot to callers.
     */
    getMetrics() {
        return this.metrics.snapshot();
    }
}
