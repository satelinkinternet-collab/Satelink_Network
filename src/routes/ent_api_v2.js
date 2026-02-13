import { Router } from 'express';

export function createEntApiRouter(opsEngine) {
    const router = Router();

    // GET /ent-api/stats
    router.get('/stats', async (req, res) => {
        try {
            const wallet = req.user.wallet;

            // Usage stats for enterprise (mocked source if lacking specific ent_usage table)
            const usage = {
                currentMonthOps: 1250,
                projectedSpend: 250.00,
                lastMonthSpend: 180.50,
                activeKeys: 5
            };

            // Invoices
            const invoices = [
                { id: 'INV-2026-001', amount: 180.50, status: 'PAID', date: '2026-01-31' },
                { id: 'INV-2026-002', amount: 250.00, status: 'PENDING', date: '2026-02-28' }
            ];

            res.json({
                ok: true,
                usage,
                invoices
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
