/**
 * Node Network Route
 * Provides the public-facing HTTP endpoints for the Node Network Layer.
 *
 * Mounted via core/routes.js as:
 *   app.use('/v1/node', createNodeNetworkRouter(db))
 *
 * Endpoints:
 *   POST /v1/node/register   — register a new node
 *   POST /v1/node/heartbeat  — receive node heartbeat
 *   GET  /v1/node/list       — list all nodes
 *   GET  /v1/node/metrics    — aggregate metrics
 *   GET  /v1/node/:id        — get single node
 */

import { Router } from 'express';
import { NodeRegistry } from '../../nodes/node_registry.js';
import { NodeHeartbeat } from '../../nodes/node_heartbeat.js';
import { NodeReputation } from '../../nodes/node_reputation.js';
import { NodeCapacity } from '../../nodes/node_capacity.js';

export function createNodeNetworkRouter(db) {
    const router = Router();

    // Initialise the Node Network Layer services.
    const registry = new NodeRegistry(db);
    const reputation = new NodeReputation(registry);
    const heartbeat = new NodeHeartbeat(registry, reputation);
    const capacity = new NodeCapacity(registry);  // used for scheduler-facing helpers

    // ─────────────────────────────────────────────────────────────
    //  POST /v1/node/register
    //  Register a new node (or upsert an existing one).
    // ─────────────────────────────────────────────────────────────
    router.post('/register', (req, res) => {
        try {
            const { node_id, node_type, region, capacity: cap } = req.body;

            if (!node_id) {
                return res.status(400).json({ ok: false, error: 'node_id is required' });
            }

            const node = registry.register({
                node_id,
                node_type: node_type || 'community',
                region: region || 'global',
                capacity: cap || 10
            });

            res.status(201).json({ ok: true, node });
        } catch (e) {
            console.error('[NodeNetwork] /register error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    //  POST /v1/node/heartbeat
    //  Receive heartbeat payload from a running node.
    // ─────────────────────────────────────────────────────────────
    router.post('/heartbeat', (req, res) => {
        try {
            const { node_id, cpu_usage, memory_usage, capacity_available, latency_ms } = req.body;

            if (!node_id) {
                return res.status(400).json({ ok: false, error: 'node_id is required' });
            }

            const result = heartbeat.receive({
                node_id,
                cpu_usage: Number(cpu_usage) || 0,
                memory_usage: Number(memory_usage) || 0,
                capacity_available: Number(capacity_available) || 0,
                latency_ms: Number(latency_ms) || 50
            });

            res.status(200).json({ ok: true, ...result });
        } catch (e) {
            console.error('[NodeNetwork] /heartbeat error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    //  GET /v1/node/metrics
    //  Aggregate metrics: total_nodes, active_nodes, capacity_available
    //  IMPORTANT: This must be defined before the :id param route.
    // ─────────────────────────────────────────────────────────────
    router.get('/metrics', (req, res) => {
        try {
            const metrics = registry.getMetrics();
            res.status(200).json({ ok: true, metrics });
        } catch (e) {
            console.error('[NodeNetwork] /metrics error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    //  GET /v1/node/list
    //  List all nodes, optionally filtered by ?status=ACTIVE
    // ─────────────────────────────────────────────────────────────
    router.get('/list', (req, res) => {
        try {
            const { status } = req.query;
            const nodes = registry.list(status || null);
            res.status(200).json({ ok: true, count: nodes.length, nodes });
        } catch (e) {
            console.error('[NodeNetwork] /list error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    //  GET /v1/node/:id
    //  Fetch a single node by node_id.
    // ─────────────────────────────────────────────────────────────
    router.get('/:id', (req, res) => {
        try {
            const node = registry.get(req.params.id);
            if (!node) {
                return res.status(404).json({ ok: false, error: 'Node not found' });
            }
            res.status(200).json({ ok: true, node });
        } catch (e) {
            console.error('[NodeNetwork] /:id error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
