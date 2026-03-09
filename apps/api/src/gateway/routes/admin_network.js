import { Router } from 'express';

export function createAdminNetworkRouter(db, densityService) {
    const router = Router();

    // M5: Node Density
    router.get('/density', async (req, res) => {
        try {
            if (!densityService) return res.json({ ok: true, history: [] });

            const mode = req.query.mode || 'history'; // history vs today/latest

            if (mode === 'latest') {
                const data = await densityService.getLatest();
                res.json({ ok: true, data });
            } else {
                const limit = req.query.limit ? parseInt(req.query.limit) : 60;
                const history = await densityService.getHistory(limit);
                res.json({ ok: true, history });
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
