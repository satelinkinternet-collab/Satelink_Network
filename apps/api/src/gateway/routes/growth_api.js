/**
 * Growth Layer HTTP Routes (Module 5 — Integration)
 *
 * Mounts all node growth endpoints:
 *
 *   GET  /v1/network/metrics      → Network-wide stats (nodes, wps, revenue, capacity)
 *   GET  /v1/nodes/leaderboard    → Top nodes by earnings
 *   POST /v1/growth/onboard       → Full node onboarding with bootstrap kit
 *   GET  /v1/growth/incentives/:node_id → Incentive breakdown for a node
 *
 * Integration (Module 5):
 *   - NetworkMetrics reads directly from node_registry + workload_metrics tables
 *   - NodeLeaderboard listens for job completions via recordJob()
 *   - NodeIncentiveEngine evaluates multipliers using registry + leaderboard data
 *   - NodeOnboardingService writes to node_registry AND seeds leaderboard
 *
 * No existing engines are modified. This is purely additive.
 */

import { Router } from 'express';
import { NetworkMetrics } from '../../monitoring/network_metrics.js';
import { NodeLeaderboard } from '../../monitoring/node_leaderboard.js';
import { NodeIncentiveEngine } from '../../economics/node_incentives.js';
import { NodeOnboardingService } from '../../nodes/node_onboarding.js';
import { NodeRegistry } from '../../nodes/node_registry.js';

/**
 * @param {Object} db
 * @returns {{ router: Router, leaderboard: NodeLeaderboard, incentives: NodeIncentiveEngine }}
 */
export function createGrowthRouter(db) {
    const router = Router();

    const metrics = new NetworkMetrics(db);
    const leaderboard = new NodeLeaderboard(db);
    const registry = new NodeRegistry(db);
    const incentives = new NodeIncentiveEngine(db, registry, leaderboard);
    const onboarding = new NodeOnboardingService(db);

    // ── GET /v1/network/metrics ───────────────────────────────────────────────
    router.get('/network/metrics', (req, res) => {
        try {
            const snap = metrics.snapshot();
            res.status(200).json({ ok: true, ...snap });
        } catch (e) {
            console.error('[Growth] /network/metrics error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── GET /v1/nodes/leaderboard ─────────────────────────────────────────────
    router.get('/services/nodes/leaderboard', (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const entries = leaderboard.getLeaderboard(limit);
            const summary = leaderboard.summary();
            res.status(200).json({ ok: true, summary, leaderboard: entries });
        } catch (e) {
            console.error('[Growth] /services/nodes/leaderboard error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── POST /v1/growth/onboard ───────────────────────────────────────────────
    router.post('/services/growth/onboard', (req, res) => {
        try {
            const { node_id, node_type, region, capacity } = req.body;
            if (!node_id) return res.status(400).json({ ok: false, error: 'node_id is required' });

            const result = onboarding.onboard({ node_id, node_type, region, capacity });
            res.status(201).json(result);
        } catch (e) {
            const status = e.message.includes('required') ? 400 : 500;
            res.status(status).json({ ok: false, error: e.message });
        }
    });

    // ── GET /v1/growth/incentives/:node_id ────────────────────────────────────
    router.get('/services/growth/incentives/:node_id', (req, res) => {
        try {
            const result = incentives.evaluate(req.params.node_id);
            res.status(200).json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return { router, leaderboard, incentives, metrics };
}
