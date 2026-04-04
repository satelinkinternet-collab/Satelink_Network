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

    // GET /ent-api/history - Daily Usage History
    router.get('/history', async (req, res) => {
        try {
            // Mock history for MVP visualization (would be agg(revenue_events) in prod)
            // Generating last 14 days
            const days = [];
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                days.push({
                    date: d.toLocaleDateString(),
                    ops: Math.floor(Math.random() * 500) + 100, // Mock data
                    spend: (Math.random() * 50).toFixed(2)
                });
            }
            res.json({ ok: true, history: days });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
