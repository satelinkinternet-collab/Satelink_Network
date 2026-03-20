import { Router } from 'express';

export function createAdminEconomicsRouter(db, breakevenService, authenticityService, stabilityService) {
    const router = Router();

    // M1: Breakeven Analysis

    // GET /economics/breakeven?day=20231027
    router.get('/breakeven', async (req, res) => {
        try {
            const day = req.query.day ? parseInt(req.query.day) : null;
            const data = await breakevenService.getOverview(day);
            res.json({ ok: true, data });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /economics/breakeven/:nodeId
    router.get('/breakeven/:nodeId', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 30;
            const history = await breakevenService.getHistory(req.params.nodeId, limit);
            res.json({ ok: true, history });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /economics/node-cost (Override)
    router.post('/node-cost', async (req, res) => {
        try {
            if (!req.user || !['admin_super', 'admin_ops'].includes(req.user.role)) {
                return res.status(403).json({ error: "Access denied" });
            }
            const { node_id, cost_usdt_day } = req.body;
            if (!node_id || cost_usdt_day === undefined) return res.status(400).json({ error: "Missing fields" });

            await breakevenService.setCostOverride(node_id, parseFloat(cost_usdt_day), req.user.wallet);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // M3: Authenticity
    router.get('/authenticity', async (req, res) => {
        try {
            if (!authenticityService) return res.json({ ok: true, history: [] });
            const limit = req.query.limit ? parseInt(req.query.limit) : 60;
            const history = await authenticityService.getHistory(limit);
            res.json({ ok: true, history });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // M4: Stability
    router.get('/stability', async (req, res) => {
        try {
            if (!stabilityService) return res.json({ ok: true, history: [] });
            const limit = req.query.limit ? parseInt(req.query.limit) : 90;
            const history = await stabilityService.getHistory(limit);
            res.json({ ok: true, history });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/economics/retention - Retention cohorts + churn-risk list
    router.get('/retention', async (req, res) => {
        try {
            const now = Date.now();
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

            // All nodes for cohort analysis
            const allNodes = await db.query("SELECT node_id, wallet, status, last_seen, created_at FROM nodes ORDER BY created_at ASC");

            // Build weekly cohorts (last 6 weeks)
            const cohorts = [];
            for (let w = 5; w >= 0; w--) {
                const cohortStart = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
                const cohortEnd   = now - w * 7 * 24 * 60 * 60 * 1000;
                const cohortNodes = allNodes.filter(n => n.created_at >= cohortStart && n.created_at < cohortEnd);
                const active = cohortNodes.filter(n => n.last_seen >= sevenDaysAgo).length;
                cohorts.push({
                    week: `W-${w === 0 ? 'current' : w}`,
                    cohort_start: cohortStart,
                    total: cohortNodes.length,
                    active,
                    retained_pct: cohortNodes.length > 0 ? Math.round((active / cohortNodes.length) * 100) : 0,
                });
            }

            // Churn-risk: nodes active within 30 days but not seen in 7+ days
            const churnRisk = allNodes
                .filter(n => n.last_seen >= thirtyDaysAgo && n.last_seen < sevenDaysAgo)
                .map(n => ({
                    node_id: n.node_id,
                    wallet: n.wallet,
                    status: n.status,
                    last_seen: n.last_seen,
                    days_inactive: Math.floor((now - n.last_seen) / (24 * 60 * 60 * 1000)),
                    risk: n.last_seen < fourteenDaysAgo ? 'HIGH' : 'MEDIUM',
                }))
                .sort((a, b) => a.last_seen - b.last_seen)
                .slice(0, 50);

            res.json({ ok: true, cohorts, churnRisk });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
