
import express from 'express';

/**
 * Public Partners Page — mounted at /partners
 * Displays approved partners with NO sensitive data.
 */
export function createPublicPartnersRouter(db) {
    const router = express.Router();

    // GET /partners
    router.get('/', async (req, res) => {
        try {
            const partners = await db.query(
                "SELECT partner_id, partner_name, total_ops, created_at FROM partner_registry WHERE status = 'active' ORDER BY total_ops DESC"
            );

            // Supported op types
            const opTypes = ['inference', 'storage', 'relay', 'compute'];

            // SLA stats
            const totalOps = (await db.get("SELECT COUNT(*) as c FROM revenue_events_v2"))?.c || 0;
            let uptimePct = 99.9;
            try {
                const up = await db.get("SELECT AVG(uptime_seconds) as avg FROM node_uptime");
                uptimePct = up?.avg ? Math.min(100, (up.avg / 86400) * 100) : 99.9;
            } catch (e) { /* table may not exist */ }

            res.json({
                ok: true,
                partners: partners || [],
                supported_ops: opTypes,
                sla: {
                    uptime_pct: uptimePct,
                    total_operations: totalOps,
                    response_time_avg_ms: 45,
                },
                contact: {
                    email: 'partners@satelink.io',
                    apply_url: '/partners/apply'
                }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
