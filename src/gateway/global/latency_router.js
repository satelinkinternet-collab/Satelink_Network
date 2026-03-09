/**
 * Latency Router (Module 3)
 *
 * Routes each incoming request to the closest / lowest-latency region.
 *
 * Region selection algorithm (priority order):
 *   1. Explicit region header (X-Satelink-Region) from client
 *   2. IP-based region heuristic (CIDR prefix matching)
 *   3. Preferred-region query parameter (?region=eu-west)
 *   4. Fastest healthy gateway by current load ratio
 *   5. Fall back to first healthy gateway
 *
 * Output:
 *   { region, gateway_id, latency_estimate_ms, method }
 */

import { GatewayClusterManager } from './gateway_cluster_manager.js';

// Rough IP-prefix → region mapping for demo / simulation
const IP_REGION_MAP = [
    { prefix: '10.', region: 'us-east' },    // RFC 1918 private → default US
    { prefix: '172.', region: 'eu-west' },
    { prefix: '192.168.', region: 'ap-south' },
    { prefix: '34.', region: 'us-east' },    // GCP US
    { prefix: '35.', region: 'us-west' },
    { prefix: '130.211.', region: 'eu-west' },    // GCP EU
    { prefix: '104.', region: 'us-east' },    // Cloudflare US
    { prefix: '2606:', region: 'us-east' }     // IPv6 Cloudflare
];

// Typical inter-region latency table (ms) — used for estimate output only
const REGION_LATENCY = {
    'us-east': 12,
    'us-west': 18,
    'eu-west': 28,
    'ap-south': 55
};

export class LatencyRouter {
    /**
     * @param {GatewayClusterManager} clusterManager
     */
    constructor(clusterManager) {
        this.cluster = clusterManager ?? new GatewayClusterManager();
    }

    /**
     * Select the optimal routing destination for a request.
     *
     * @param {Object} opts
     * @param {string} [opts.client_ip]        — originating IP
     * @param {string} [opts.region]           — explicit region hint
     * @param {string} [opts.preferred_region] — query param override
     * @returns {{ region, gateway_id, gateway, latency_estimate_ms, method }}
     */
    route({ client_ip, region, preferred_region } = {}) {
        // 1. Explicit region override (X-Satelink-Region header)
        if (region) {
            const gw = this.cluster.getBestForRegion(region);
            if (gw) return this._result(gw, 'explicit_header');
        }

        // 2. Preferred region query param
        if (preferred_region) {
            const gw = this.cluster.getBestForRegion(preferred_region);
            if (gw) return this._result(gw, 'query_param');
        }

        // 3. IP-based heuristic
        if (client_ip) {
            const ipRegion = this._ipToRegion(client_ip);
            if (ipRegion) {
                const gw = this.cluster.getBestForRegion(ipRegion);
                if (gw) return this._result(gw, 'ip_heuristic');
            }
        }

        // 4. Lowest load ratio across all healthy gateways
        const healthy = this.cluster.getHealthy();
        if (healthy.length) {
            const best = healthy.sort((a, b) => {
                const loadA = a.current_load / Math.max(a.capacity, 1);
                const loadB = b.current_load / Math.max(b.capacity, 1);
                return loadA - loadB;
            })[0];
            return this._result(best, 'load_balanced');
        }

        // 5. Hard fallback
        const any = this.cluster.list()[0];
        return any ? this._result(any, 'fallback') : null;
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _ipToRegion(ip) {
        for (const { prefix, region } of IP_REGION_MAP) {
            if (ip.startsWith(prefix)) return region;
        }
        return null;
    }

    _result(gw, method) {
        return {
            region: gw.region,
            gateway_id: gw.gateway_id,
            gateway: gw,
            latency_estimate_ms: REGION_LATENCY[gw.region] ?? 50,
            method
        };
    }
}
