/**
 * Gateway Layer HTTP Routes
 *
 * Exposes gateway management and metrics endpoints.
 * Also exports the factory that wires the GlobalGatewayRouter middleware
 * into the main Express app.
 *
 * Endpoints:
 *   GET  /v1/gateway/metrics        → gateway_requests, latency, cache_hits, regional_traffic
 *   GET  /v1/gateway/cluster        → all gateway instances + aggregate cluster metrics
 *   POST /v1/gateway/cluster/register → register a new gateway instance
 *   POST /v1/gateway/cluster/:id/heartbeat → update health for a gateway
 *   GET  /v1/gateway/route          → dry-run latency routing (diagnostic)
 */

import { Router } from 'express';
import { GlobalGatewayRouter } from '../../gateway/global/global_gateway_router.js';
import { GatewayClusterManager } from '../../gateway/global/gateway_cluster_manager.js';

/**
 * Build the gateway layer and return its pieces.
 *
 * @param {Object} db
 * @param {Object} pipeline  — exposes push_job(job)
 * @returns {{ middleware, router, gateway: GlobalGatewayRouter }}
 */
export function createGatewayLayer(db, pipeline) {
    const cluster = new GatewayClusterManager();
    const gateway = new GlobalGatewayRouter(db, pipeline, cluster, pool);
    const router = Router();

    // ── GET /v1/gateway/metrics ───────────────────────────────────────────────
    router.get('/metrics', (req, res) => {
        res.status(200).json({ ok: true, metrics: gateway.getMetrics() });
    });

    // ── GET /v1/gateway/cluster ───────────────────────────────────────────────
    router.get('/cluster', (req, res) => {
        res.status(200).json({
            ok: true,
            cluster: gateway.getCluster(),
            gateways: cluster.list()
        });
    });

    // ── POST /v1/gateway/cluster/register ─────────────────────────────────────
    router.post('/cluster/register', (req, res) => {
        try {
            const { gateway_id, region, capacity } = req.body;
            if (!gateway_id || !region) {
                return res.status(400).json({ ok: false, error: 'gateway_id and region are required' });
            }
            const gw = cluster.register({ gateway_id, region, capacity });
            res.status(201).json({ ok: true, gateway: gw });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── POST /v1/gateway/cluster/:id/heartbeat ────────────────────────────────
    router.post('/cluster/:id/heartbeat', (req, res) => {
        const result = cluster.heartbeat(req.params.id, req.body);
        if (!result.ok) return res.status(404).json(result);
        res.status(200).json(result);
    });

    // ── GET /v1/gateway/route  (diagnostic — dry-run routing) ─────────────────
    router.get('/route', (req, res) => {
        const { region, ip } = req.query;
        const route = gateway.latency.route({
            client_ip: ip || req.ip,
            region: region || req.headers['x-satelink-region'] || null
        });
        res.status(200).json({ ok: true, route });
    });

    // ── GET /v1/gateway/cache ─────────────────────────────────────────────────
    router.get('/cache', (req, res) => {
        res.status(200).json({ ok: true, cache: gateway.getCache() });
    });

    return { middleware: gateway.middleware(), router, gateway };
}
