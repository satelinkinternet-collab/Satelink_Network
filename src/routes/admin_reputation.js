
import express from 'express';
import { ReputationEngine } from '../services/reputation_engine.js';

/**
 * Admin Reputation Routes — mounted at /admin/network
 * (reputation endpoints) and /admin/economics (reputation-impact)
 */
export function createAdminReputationRouter(db) {
    const router = express.Router();
    const engine = new ReputationEngine(db);

    // GET /admin/network/reputation — all nodes with scores
    router.get('/reputation', async (req, res) => {
        try {
            const nodes = await engine.getAllReputations();
            const tiers = await engine.getTierDistribution();
            res.json({ ok: true, nodes, tiers, total: nodes.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/network/reputation/incidents — check reputation incident
    // (static route MUST come before :nodeId)
    router.get('/reputation/incidents', async (req, res) => {
        try {
            const result = await engine.checkReputationIncident();
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/network/reputation/compute — trigger daily scoring
    router.post('/reputation/compute', async (req, res) => {
        try {
            const result = await engine.computeAllScores();
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/network/reputation/decay — trigger decay
    router.post('/reputation/decay', async (req, res) => {
        try {
            const result = await engine.applyDecay(req.body?.days || 7);
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/network/reputation/fraud-penalty — apply fraud penalty
    router.post('/reputation/fraud-penalty', async (req, res) => {
        try {
            const result = await engine.applyFraudPenalty(req.body.node_id, req.body.penalty || 30);
            res.json(result);
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/network/reputation/:nodeId — single node detail
    // (parameterized route MUST come after static routes)
    router.get('/reputation/:nodeId', async (req, res) => {
        try {
            const rep = await engine.getNodeReputation(req.params.nodeId);
            if (!rep) return res.status(404).json({ ok: false, error: 'Node not found' });
            const history = await db.query(
                "SELECT composite_score, tier, recorded_at FROM reputation_history WHERE node_id = ? ORDER BY recorded_at DESC LIMIT 30",
                [req.params.nodeId]
            ) || [];
            res.json({ ok: true, reputation: rep, history });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}

/**
 * Admin Reputation Impact Router — mounted at /admin/economics
 */
export function createAdminReputationImpactRouter(db) {
    const router = express.Router();
    const engine = new ReputationEngine(db);

    // GET /admin/economics/reputation-impact
    router.get('/reputation-impact', async (req, res) => {
        try {
            const impact = await engine.getReputationImpact();
            const tiers = await engine.getTierDistribution();
            res.json({
                ok: true,
                multipliers: ReputationEngine.MULTIPLIERS,
                tier_thresholds: ReputationEngine.TIERS,
                ...impact,
                tier_distribution: tiers,
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
