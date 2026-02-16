
import express from 'express';

/**
 * Admin Distributors Router
 * Mounted at /admin/distributors (behind verifyJWT in server.js)
 */
export function createAdminDistributorsRouter(db) {
    const router = express.Router();

    // GET /admin/distributors/performance
    router.get('/performance', async (req, res) => {
        try {
            const { GrowthEngine } = await import('../services/growth_engine.js');
            const engine = new GrowthEngine(db);

            const distributors = await engine.getDistributorPerformance();
            const fraud = await engine.detectCommissionFraud();

            res.json({
                ok: true,
                distributors,
                fraud_summary: {
                    total_flags: fraud.total_flags,
                    alerts: fraud.alerts.slice(0, 20)
                }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/distributors/commissions
    router.get('/commissions', async (req, res) => {
        try {
            const { GrowthEngine } = await import('../services/growth_engine.js');
            const engine = new GrowthEngine(db);
            const stats = await engine.getCommissionsStats();
            res.json({ ok: true, ...stats });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
