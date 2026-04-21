/**
 * Global Gateway Router (Module 1)
 *
 * The central entry point for all external infrastructure requests.
 *
 * Supported gateway paths (forwarded to the demand engine pipeline):
 *   /rpc          — blockchain RPC calls
 *   /v1/ops       — universal ops
 *   /v1/webhook   — webhook delivery
 *   /v1/jobs      — automation jobs
 *
 * Request lifecycle:
 *   1. Check edge cache (for cacheable RPC methods)
 *   2. Run latency router to select optimal gateway/region
 *   3. Run traffic balancer to select specific gateway instance
 *   4. Forward request body to the demand pipeline
 *   5. Record metrics (latency, region, cache miss/hit)
 *   6. Return result
 *
 * The gateway does NOT modify the existing Express routes — it is an
 * additive middleware layer applied BEFORE the actual route handlers.
 * Its main value is region selection, cache, and metrics enrichment.
 */

import crypto from 'crypto';
import { LatencyRouter } from './latency_router.js';
import { TrafficBalancer } from './traffic_balancer.js';
import { GatewayClusterManager } from './gateway_cluster_manager.js';
import { EdgeCache } from './edge_cache.js';
import { GatewayMetrics } from './gateway_metrics.js';

// RPC methods whose responses are safe to cache
const CACHEABLE_RPC_METHODS = new Set([
    'eth_blockNumber', 'eth_chainId', 'eth_gasPrice',
    'net_version', 'web3_clientVersion', 'eth_getBalance'
]);

const RPC_REWARD_USDT = 0.0003;

export class GlobalGatewayRouter {
    /**
     * @param {Object}                  db
     * @param {Object}                  demandPipeline    — exposes push_job(job)
     * @param {GatewayClusterManager}   [clusterManager]  — optional, creates default if omitted
     */
    constructor(db, demandPipeline, clusterManager, db) {
    this.db = db;
        this.db = db;
        this.pipeline = demandPipeline;
        this.cluster = clusterManager ?? new GatewayClusterManager();
        this.cache = new EdgeCache();
        this.metrics = new GatewayMetrics(db);
        this.latency = new LatencyRouter(this.cluster);
        this.balancer = new TrafficBalancer(this.cluster, 'latency_weighted');
    }

    async _recordRevenue(clientId, isCacheHit = false) {
        if (!this.db) { console.error("DB NOT ATTACHED"); return; }
            console.warn('[Gateway] _recordRevenue called but db is null');
            return;
        }
        const request_id = `rpc_${crypto.randomUUID()}`;
        try {
            let epochId = null;
            try {
                const epochRow = await this.db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get([]);
                epochId = epochRow?.id || null;
                if (!epochId) {
                    console.log('[Gateway] No OPEN epoch found, creating one...');
                    const now = Math.floor(Date.now() / 1000);
                    const insertResult = await this.db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN') RETURNING id").get([now]);
                    epochId = insertResult?.id || null;
                    console.log('[Gateway] Created epoch:', epochId);
                }
            } catch (epochErr) {
                console.error('[Gateway] Epoch query failed:', epochErr.message);
            }

            const now = Math.floor(Date.now() / 1000);
            const result = await this.db.prepare(`
                INSERT INTO revenue_events_v2 (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
                VALUES (?, 'rpc_call', ?, ?, ?, 'success', ?, ?)
            `).run([epochId, isCacheHit ? 'edge_cache' : 'external_provider', clientId, RPC_REWARD_USDT, request_id, now]);
            console.log('[Gateway] Revenue recorded:', { epochId, clientId, amount: RPC_REWARD_USDT, isCacheHit, changes: result?.changes });
        } catch (e) {
            console.error('[Gateway] Revenue recording failed:', e.message);
        }
    }

    /**
     * Returns an Express middleware that instruments every gateway request.
     * Mount BEFORE the actual route handlers.
     *
     * app.use(router.middleware());
     */
    middleware() {
        return (req, res, next) => {
            const start = Date.now();

            // Extract routing hints from headers / query
            const clientIp = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
            const regionHint = req.headers['x-satelink-region'] || req.query.region || null;

            // ── 1. Latency routing ────────────────────────────────────────────
            const route = this.latency.route({ client_ip: clientIp, region: regionHint });

            // ── 2. Traffic balancing ──────────────────────────────────────────
            const gw = this.balancer.next(route?.region);

            // Attach gateway context to request for downstream handlers
            req.gatewayContext = {
                region: route?.region ?? 'unknown',
                gateway_id: gw?.gateway_id ?? 'none',
                method: route?.method ?? 'none'
            };

            // ── 3. Metrics pre-hook ───────────────────────────────────────────
            this.metrics.incRequests();
            this.metrics.incRegionalTraffic(route?.region ?? 'unknown');

            // ── 4. Cache check for GET-style RPC calls ────────────────────────
            const clientId = req.headers['x-api-key'] || 'rpc_gateway';

            if (req.method === 'POST' && this._isCacheablePath(req.path) && req.body?.method) {
                const cacheKey = this._cacheKey(req);
                const cached = this.cache.get(cacheKey);

                if (cached !== null) {
                    this.metrics.incCacheHits();
                    const elapsed = Date.now() - start;
                    this.metrics.recordLatency(elapsed);
                    this._recordRevenue(clientId, true);
                    return res.status(200).json(cached);
                }

                // Wrap res.json to populate cache on the way out AND record revenue
                const _json = res.json.bind(res);
                res.json = (body) => {
                    if (res.statusCode === 200 && body) {
                        this.cache.set(cacheKey, body);
                        this._recordRevenue(clientId, false);
                    }
                    const elapsed2 = Date.now() - start;
                    this.metrics.recordLatency(elapsed2);
                    return _json(body);
                };
                req._billingHandledByGateway = true;
            } else {
                // Non-cacheable — still record latency on response
                const _json = res.json.bind(res);
                res.json = (body) => {
                    this.metrics.recordLatency(Date.now() - start);
                    return _json(body);
                };
            }

            next();
        };
    }

    /**
     * Forward a normalised workload directly to the demand pipeline.
     * Used by tests and programmatic callers (not the HTTP middleware path).
     *
     * @param {{ op_type, target, payload, reward }} workload
     * @returns {Promise<{ ok: boolean, job_id?: string }>}
     */
    async forward(workload) {
        const start = Date.now();
        try {
            const job = {
                id: `gw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type: workload.op_type,
                chain: workload.target,
                reward: workload.reward ?? 0.001,
                payload: workload.payload,
                priority: 'developer',
                client_id: 'gateway',
                is_universal_op: true,
                is_gateway_job: true
            };
            await this.pipeline.push_job(job);
            this.metrics.incRequests();
            this.metrics.recordLatency(Date.now() - start);
            return { ok: true, job_id: job.id };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    getMetrics() { return this.metrics.snapshot(); }
    getCluster() { return this.cluster.getMetrics(); }
    getCache() { return { size: this.cache.size() }; }

    // ─── Private ─────────────────────────────────────────────────────────────

    _isCacheablePath(path) {
        return path.startsWith('/rpc') || path.includes('/workload/rpc');
    }

    _cacheKey(req) {
        const method = req.body?.method ?? 'unknown';
        const params = JSON.stringify(req.body?.params ?? []);
        return `${req.path}:${method}:${params}`;
    }
}
