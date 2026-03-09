/**
 * Gateway Cluster Manager (Module 2)
 *
 * Manages a collection of logical gateway instances.
 * Each instance represents a regional Gateway deployment with:
 *   gateway_id    — unique ID
 *   region        — deployment region (us-east, eu-west, ap-south, …)
 *   capacity      — max concurrent requests
 *   health_status — 'healthy' | 'degraded' | 'offline'
 *   current_load  — currently allocated request slots
 *
 * Provides:
 *   register()     — add a new gateway instance
 *   heartbeat()    — update health / load metrics
 *   getHealthy()   — return instances that can accept traffic
 *   list()         — all registered gateways
 *   getMetrics()   — aggregate cluster summary
 */

export class GatewayClusterManager {
    constructor() {
        this._gateways = new Map(); // gateway_id → descriptor
        this._seedDefaults();
    }

    // ─── Bootstrap defaults ───────────────────────────────────────────────────

    /**
     * Seed the four canonical Satelink gateway regions so the system
     * is functional even without explicit registration calls.
     */
    _seedDefaults() {
        const defaults = [
            { gateway_id: 'gw-us-east-1', region: 'us-east', capacity: 1000 },
            { gateway_id: 'gw-eu-west-1', region: 'eu-west', capacity: 1000 },
            { gateway_id: 'gw-ap-south-1', region: 'ap-south', capacity: 500 },
            { gateway_id: 'gw-us-west-1', region: 'us-west', capacity: 500 }
        ];
        for (const d of defaults) this.register(d);
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /**
     * Register or upsert a gateway instance.
     *
     * @param {Object} opts
     * @param {string} opts.gateway_id
     * @param {string} opts.region
     * @param {number} [opts.capacity]
     * @returns {Object} gateway descriptor
     */
    register({ gateway_id, region, capacity = 500 }) {
        if (!gateway_id) throw new Error('[ClusterManager] gateway_id is required');
        if (!region) throw new Error('[ClusterManager] region is required');

        const existing = this._gateways.get(gateway_id);
        const gw = {
            gateway_id,
            region,
            capacity: capacity,
            current_load: existing?.current_load ?? 0,
            health_status: existing?.health_status ?? 'healthy',
            registered_at: existing?.registered_at ?? Date.now(),
            last_heartbeat: Date.now()
        };
        this._gateways.set(gateway_id, gw);
        return { ...gw };
    }

    /**
     * Update health metrics from a heartbeat.
     *
     * @param {string} gateway_id
     * @param {{ current_load?, health_status?, capacity? }} update
     */
    heartbeat(gateway_id, update = {}) {
        const gw = this._gateways.get(gateway_id);
        if (!gw) return { ok: false, reason: 'gateway not found' };

        if (typeof update.current_load === 'number') gw.current_load = update.current_load;
        if (typeof update.capacity === 'number') gw.capacity = update.capacity;
        if (update.health_status) gw.health_status = update.health_status;
        gw.last_heartbeat = Date.now();

        return { ok: true, gateway_id, health_status: gw.health_status };
    }

    // ─── Query helpers ────────────────────────────────────────────────────────

    /**
     * Return all healthy gateways (optionally filtered by region).
     *
     * @param {string|null} region
     */
    getHealthy(region = null) {
        const all = [...this._gateways.values()].filter(g => g.health_status === 'healthy');
        if (region) return all.filter(g => g.region === region);
        return all;
    }

    /**
     * Return the gateway with the most available capacity in the given region.
     *
     * @param {string} region
     * @returns {Object|null}
     */
    getBestForRegion(region) {
        const candidates = this.getHealthy(region);
        if (!candidates.length) {
            // Fall back to any healthy gateway
            return this.getHealthy()[0] ?? null;
        }
        return candidates.sort((a, b) => (b.capacity - b.current_load) - (a.capacity - a.current_load))[0];
    }

    list() {
        return [...this._gateways.values()].map(g => ({ ...g }));
    }

    getMetrics() {
        const all = this.list();
        return {
            total_gateways: all.length,
            healthy_gateways: all.filter(g => g.health_status === 'healthy').length,
            total_capacity: all.reduce((s, g) => s + g.capacity, 0),
            total_load: all.reduce((s, g) => s + g.current_load, 0),
            regions: [...new Set(all.map(g => g.region))]
        };
    }
}
