/**
 * Traffic Balancer (Module 4)
 *
 * Distributes incoming requests across healthy gateway instances
 * using one of three configurable algorithms:
 *
 *   round_robin       — cycles through gateways in order
 *   latency_weighted  — favours gateways with lower latency estimates
 *   capacity_weighted — favours gateways with the most free capacity
 *
 * Usage:
 *   const balancer = new TrafficBalancer(clusterManager, 'round_robin');
 *   const gw = balancer.next(region?);
 *   balancer.setMethod('capacity_weighted');
 */

import { GatewayClusterManager } from './gateway_cluster_manager.js';

// Per-region static latency baseline (ms) — mirrors latency_router.js
const REGION_LATENCY_MS = {
    'us-east': 12,
    'us-west': 18,
    'eu-west': 28,
    'ap-south': 55
};

export class TrafficBalancer {
    static METHODS = new Set(['round_robin', 'latency_weighted', 'capacity_weighted']);

    /**
     * @param {GatewayClusterManager} clusterManager
     * @param {'round_robin'|'latency_weighted'|'capacity_weighted'} method
     */
    constructor(clusterManager, method = 'round_robin') {
        this.cluster = clusterManager ?? new GatewayClusterManager();
        this._method = 'round_robin';
        this._rrIndex = 0;
        this.setMethod(method);
    }

    /**
     * Switch balancing method at runtime.
     */
    setMethod(method) {
        if (!TrafficBalancer.METHODS.has(method)) {
            throw new Error(`[TrafficBalancer] unknown method: ${method}. Valid: ${[...TrafficBalancer.METHODS].join(', ')}`);
        }
        this._method = method;
    }

    get method() { return this._method; }

    /**
     * Pick the next gateway for the given region (optional).
     *
     * @param {string|null} region   — filter to a specific region if provided
     * @returns {Object|null}        — gateway descriptor, or null if none available
     */
    next(region = null) {
        let pool = this.cluster.getHealthy(region);

        // If region-filtered pool is empty, fall back to all healthy gateways
        if (!pool.length && region) pool = this.cluster.getHealthy();
        if (!pool.length) return null;

        switch (this._method) {
            case 'round_robin': return this._roundRobin(pool);
            case 'latency_weighted': return this._latencyWeighted(pool);
            case 'capacity_weighted': return this._capacityWeighted(pool);
            default: return pool[0];
        }
    }

    // ─── Balancing algorithms ─────────────────────────────────────────────────

    _roundRobin(pool) {
        const gw = pool[this._rrIndex % pool.length];
        this._rrIndex = (this._rrIndex + 1) % pool.length;
        return gw;
    }

    _latencyWeighted(pool) {
        // Lowest latency wins; ties broken by lowest load
        return pool.slice().sort((a, b) => {
            const latA = REGION_LATENCY_MS[a.region] ?? 100;
            const latB = REGION_LATENCY_MS[b.region] ?? 100;
            if (latA !== latB) return latA - latB;
            return (a.current_load / Math.max(a.capacity, 1)) -
                (b.current_load / Math.max(b.capacity, 1));
        })[0];
    }

    _capacityWeighted(pool) {
        // Most available capacity wins
        return pool.slice().sort((a, b) =>
            (b.capacity - b.current_load) - (a.capacity - a.current_load)
        )[0];
    }
}
