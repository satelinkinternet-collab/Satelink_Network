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

            // Also persist to registered_nodes for epoch earnings distribution
            try {
                const now = Math.floor(Date.now() / 1000);
                const wallet = req.body.wallet || node_id;
                const mgmt = req.body.management_type || 'self_hosted';
                db.prepare(`
                    INSERT INTO registered_nodes (wallet, node_id, node_type, active, last_heartbeat, updatedAt, management_type)
                    VALUES (?, ?, ?, 1, ?, ?, ?)
                    ON CONFLICT(wallet) DO UPDATE SET
                        node_id = excluded.node_id,
                        node_type = excluded.node_type,
                        active = 1,
                        updatedAt = excluded.updatedAt
                `).run(wallet, node_id, node_type || 'community', now, now, mgmt);
            } catch (e) {
                // Best-effort persistence
                console.warn('[NodeNetwork] registered_nodes upsert:', e.message);
            }

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

            // Persist uptime to DB for epoch earnings distribution
            try {
                const now = Math.floor(Date.now() / 1000);
                db.prepare("UPDATE registered_nodes SET last_heartbeat = ?, active = 1 WHERE node_id = ? OR wallet = ?")
                    .run(now, node_id, node_id);
                const epochRow = db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
                if (epochRow) {
                    const existing = db.prepare("SELECT 1 FROM node_uptime WHERE node_wallet = ? AND epoch_id = ?").get(node_id, epochRow.id);
                    if (existing) {
                        db.prepare("UPDATE node_uptime SET uptime_seconds = uptime_seconds + 60, score = score + 60 WHERE node_wallet = ? AND epoch_id = ?")
                            .run(node_id, epochRow.id);
                    } else {
                        db.prepare("INSERT INTO node_uptime (node_wallet, epoch_id, uptime_seconds, score) VALUES (?, ?, 60, 60)")
                            .run(node_id, epochRow.id);
                    }
                }
            } catch (e) { /* uptime tracking best-effort */ }

            res.status(200).json({ ok: true, ...result });
        } catch (e) {
            console.error('[NodeNetwork] /heartbeat error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    //  GET /v1/node/jobs
    //  Fetch pending jobs assigned to a specific node.
    // ─────────────────────────────────────────────────────────────
    router.get('/jobs', (req, res) => {
        try {
            const { node_id } = req.query;
            if (!node_id) {
                return res.status(400).json({ ok: false, error: 'node_id query parameter is required' });
            }

            // Fetch pending jobs from job_queue_log assigned to this node
            let jobs = [];
            try {
                jobs = db.prepare(
                    "SELECT * FROM job_queue_log WHERE route = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 10"
                ).all(node_id);
            } catch (e) {
                // Table may not exist yet — return empty
            }

            res.json({ ok: true, count: jobs.length, jobs });
        } catch (e) {
            console.error('[NodeNetwork] /jobs error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─────────────────────────────────────────────────────────────
    //  POST /v1/node/submit
    //  Submit execution results for a completed job.
    // ─────────────────────────────────────────────────────────────
    router.post('/submit', async (req, res) => {
        try {
            const { node_id, job_id, result, status: jobStatus, duration_ms } = req.body;

            if (!node_id || !job_id) {
                return res.status(400).json({ ok: false, error: 'node_id and job_id are required' });
            }

            const finalStatus = jobStatus || 'completed';
            const now = Math.floor(Date.now() / 1000);

            // Update job status in job_queue_log
            try {
                db.prepare(
                    "UPDATE job_queue_log SET status = ?, completed_at = ? WHERE job_id = ?"
                ).run(finalStatus, now, job_id);
            } catch (e) {
                // best-effort update
            }

            // Record execution metric
            try {
                const existing = db.prepare(
                    "SELECT id FROM execution_metrics WHERE source_id = ? AND source_type = 'node'"
                ).get(node_id);

                if (existing) {
                    db.prepare(
                        "UPDATE execution_metrics SET requests_handled = requests_handled + 1, latency_avg = ?, updated_at = ? WHERE id = ?"
                    ).run(duration_ms || 0, now, existing.id);
                } else {
                    db.prepare(
                        "INSERT INTO execution_metrics (source_id, source_type, chain, requests_handled, latency_avg, updated_at) VALUES (?, 'node', 'fuse', 1, ?, ?)"
                    ).run(node_id, duration_ms || 0, now);
                }
            } catch (e) {
                // best-effort metric update
            }

            // Increment node earnings tracking
            try {
                const epochRow = db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
                if (epochRow) {
                    const existing = db.prepare(
                        "SELECT id FROM epoch_earnings WHERE epoch_id = ? AND wallet_or_node_id = ? AND role = 'node_operator'"
                    ).get(epochRow.id, node_id);

                    if (existing) {
                        db.prepare(
                            "UPDATE epoch_earnings SET amount_usdt = amount_usdt + 0.01 WHERE id = ?"
                        ).run(existing.id);
                    } else {
                        db.prepare(
                            "INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'node_operator', ?, 0.01, 'UNPAID', ?)"
                        ).run(epochRow.id, node_id, now);
                    }
                }
            } catch (e) {
                // best-effort earnings update
            }

            res.json({ ok: true, job_id, status: finalStatus, node_id });
        } catch (e) {
            console.error('[NodeNetwork] /submit error:', e.message);
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
