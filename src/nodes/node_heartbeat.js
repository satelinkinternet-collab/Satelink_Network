/**
 * Node Heartbeat Handler
 *
 * Receives periodic heartbeats from community nodes and uses each payload to:
 *   1. Mark the node ACTIVE (or create it if unseen).
 *   2. Update its available capacity via NodeCapacity.
 *   3. Persist a raw stats snapshot for the reputation engine.
 *
 * Designed to be used by the Express route:
 *   POST /v1/node/heartbeat
 *
 * Payload shape:
 *   {
 *     node_id:            string,
 *     cpu_usage:          number,   // 0–100 %
 *     memory_usage:       number,   // 0–100 %
 *     capacity_available: number    // spare compute units 0–100
 *   }
 */

import { NodeCapacity } from './node_capacity.js';

export class NodeHeartbeat {
    /**
     * @param {import('./node_registry.js').NodeRegistry} registry
     * @param {import('./node_reputation.js').NodeReputation} [reputation]
     */
    constructor(registry, reputation = null) {
        this.registry = registry;
        this.reputation = reputation;
        this.capacity = new NodeCapacity(registry);

        /** In-memory stats accumulator per node_id (survives restart only within process lifetime) */
        this._stats = {};
    }

    /**
     * Process an inbound heartbeat and return a status summary.
     *
     * @param {Object} payload
     * @param {string} payload.node_id
     * @param {number} [payload.cpu_usage]
     * @param {number} [payload.memory_usage]
     * @param {number} [payload.capacity_available]
     * @param {number} [payload.latency_ms]         - optional self-reported latency
     * @returns {Object}
     */
    receive({ node_id, cpu_usage = 0, memory_usage = 0, capacity_available = 0, latency_ms = 50 }) {
        if (!node_id) throw new Error('[NodeHeartbeat] node_id is required');

        // 1. Ensure the node exists in the registry (upsert).
        const existing = this.registry.get(node_id);
        if (!existing) {
            this.registry.register({ node_id, node_type: 'community' });
        } else {
            // Re-activate in case it was marked INACTIVE previously.
            this.registry.setStatus(node_id, 'ACTIVE');
        }

        // 2. Update capacity from heartbeat data.
        this.capacity.update(node_id, capacity_available);

        // 3. Accumulate stats for reputation calculation.
        this._updateStats(node_id, latency_ms);

        // 4. Optionally refresh reputation score.
        let reputationResult = null;
        if (this.reputation) {
            const stats = this._stats[node_id];
            reputationResult = this.reputation.update(node_id, {
                uptime_pct: stats.uptime_pct,
                jobs_total: stats.jobs_total,
                jobs_succeeded: stats.jobs_succeeded,
                latency_ms: stats.latency_ms_avg
            });
        }

        return {
            node_id,
            status: 'ACTIVE',
            capacity_available,
            cpu_usage,
            memory_usage,
            reputation: reputationResult ? reputationResult.score : null,
            timestamp: Date.now()
        };
    }

    /**
     * Record a job outcome to refine the in-memory reputation stats.
     * Called externally (e.g., by the job scheduler) after a job completes.
     *
     * @param {string} node_id
     * @param {boolean} succeeded
     */
    recordJobOutcome(node_id, succeeded) {
        if (!this._stats[node_id]) this._initStats(node_id);
        const s = this._stats[node_id];
        s.jobs_total += 1;
        s.jobs_succeeded += succeeded ? 1 : 0;
    }

    // ─── Private ─────────────────────────────────────────────────────────

    _initStats(node_id) {
        this._stats[node_id] = {
            heartbeats: 0,
            uptime_pct: 100,
            jobs_total: 0,
            jobs_succeeded: 0,
            latency_ms_avg: 50,
            first_seen: Date.now()
        };
    }

    _updateStats(node_id, latency_ms) {
        if (!this._stats[node_id]) this._initStats(node_id);
        const s = this._stats[node_id];
        s.heartbeats += 1;

        // Rolling EMA for latency (α = 0.3)
        s.latency_ms_avg = Math.round(0.3 * latency_ms + 0.7 * s.latency_ms_avg);

        // Uptime stays 100 as long as heartbeats arrive (degraded detection is out-of-band)
        s.uptime_pct = 100;
    }
}
