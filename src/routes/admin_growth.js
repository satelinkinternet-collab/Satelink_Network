
import express from 'express';
import { RegionEngine } from '../services/region_engine.js';
import { GrowthEngine } from '../services/growth_engine.js';

/**
 * Admin Growth Routes — mounted at /admin/growth
 * Handles regions, referrals, and marketing metrics.
 */
export function createAdminGrowthRouter(db) {
    const router = express.Router();
    const regionEngine = new RegionEngine(db);

    // ── REGIONS ──────────────────────────────────

    // GET /admin/growth/regions
    router.get('/regions', async (req, res) => {
        try {
            const regions = await regionEngine.getRegions();
            res.json({ ok: true, regions });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // PUT /admin/growth/regions/:code
    router.put('/regions/:code', async (req, res) => {
        try {
            const result = await regionEngine.updateRegion(req.params.code, req.body);
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/growth/regions/:code/check
    router.get('/regions/:code/check', async (req, res) => {
        try {
            const result = await regionEngine.checkRegionAllowed(req.params.code);
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── REFERRALS ────────────────────────────────

    // GET /admin/growth/referrals
    router.get('/referrals', async (req, res) => {
        try {
            const engine = new GrowthEngine(db);
            const fraud = await engine.detectCommissionFraud();
            const commissions = await engine.getCommissionsStats();
            const referralTree = await db.query(`
                SELECT distributor_wallet, tier_level, referral_depth, decay_days, parent_referrer,
                       SUM(amount_usdt) as total_earned
                FROM distributor_commissions
                GROUP BY distributor_wallet
                ORDER BY total_earned DESC LIMIT 100
            `);
            res.json({ ok: true, referralTree, fraud, commissions });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── MARKETING METRICS ────────────────────────

    // GET /admin/growth/marketing
    router.get('/marketing', async (req, res) => {
        try {
            const now = Date.now();
            const dayAgo = now - 86400000;
            const weekAgo = now - 7 * 86400000;

            // Nodes per day (7d)
            const nodesPerDay = await db.query(`
                SELECT date(created_at/1000, 'unixepoch') as day, COUNT(*) as count
                FROM nodes
                WHERE created_at > ?
                GROUP BY day ORDER BY day
            `, [weekAgo]) || [];

            // Churn rate (nodes gone offline)
            let activeNow = 0, activeWeekAgo = 0;
            try {
                activeNow = (await db.get("SELECT COUNT(DISTINCT node_wallet) as c FROM node_uptime WHERE uptime_seconds > 0"))?.c || 0;
                const totalEver = (await db.get("SELECT COUNT(*) as c FROM nodes"))?.c || 1;
                activeWeekAgo = totalEver;
            } catch (e) { /* tables may not exist */ }
            const churnRate = activeWeekAgo > 0 ? ((activeWeekAgo - activeNow) / activeWeekAgo) * 100 : 0;

            // Revenue per region
            const revenueByRegion = await regionEngine.getRegions();

            // Ops growth rate
            const opsThisWeek = (await db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?", [weekAgo]))?.c || 0;
            const opsPrevWeek = (await db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ? AND created_at <= ?", [weekAgo - 7 * 86400000, weekAgo]))?.c || 0;
            const opsGrowthRate = opsPrevWeek > 0 ? ((opsThisWeek - opsPrevWeek) / opsPrevWeek) * 100 : 0;

            // Partner usage
            const partnerUsage = await db.query("SELECT partner_id, partner_name, total_ops, total_revenue FROM partner_registry WHERE status = 'active' ORDER BY total_ops DESC LIMIT 10") || [];

            // Alerts
            const alerts = [];
            if (churnRate > 20) alerts.push({ level: 'critical', message: `Churn spike: ${churnRate.toFixed(1)}%` });
            if (opsGrowthRate < -30) alerts.push({ level: 'warning', message: `Sudden usage drop: ${opsGrowthRate.toFixed(1)}%` });
            if (opsGrowthRate === 0 && opsThisWeek === 0) alerts.push({ level: 'info', message: 'Revenue stagnation — no ops this week' });

            res.json({
                ok: true,
                nodes_per_day: nodesPerDay,
                churn_rate: churnRate,
                active_nodes: activeNow,
                revenue_by_region: revenueByRegion,
                ops_this_week: opsThisWeek,
                ops_growth_rate: opsGrowthRate,
                partner_usage: partnerUsage,
                alerts
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
