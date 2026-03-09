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

    return router;
}
