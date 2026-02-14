
import express from 'express';

export function createAdminRevenueRouter(db) {
    const router = express.Router();
    // NOTE: All routes already protected by verifyJWT in server.js mounting

    // ── Audit helper ───────────────────────────────────────────
    async function auditLog(action, actor, details) {
        try {
            await db.query(
                `INSERT INTO admin_audit_log (action, actor, details, created_at) VALUES (?, ?, ?, ?)`,
                [action, actor, JSON.stringify(details), Date.now()]
            );
        } catch (e) { console.error('[AuditLog]', e.message); }
    }

    // POST /admin/revenue/pricing/update
    // SuperAdmin only — all changes audited
    router.post('/pricing/update', async (req, res) => {
        // Role check: only admin_super can update pricing
        if (req.user?.role !== 'admin_super') {
            return res.status(403).json({ ok: false, error: 'Super admin required for pricing updates' });
        }

        const { op_type, base_price_usdt, surge_enabled, surge_threshold, surge_multiplier } = req.body;

        if (!op_type || base_price_usdt === undefined) {
            return res.status(400).json({ ok: false, error: "Missing op_type or base_price_usdt" });
        }

        try {
            const now = Date.now();
            await db.query(`
                INSERT INTO pricing_rules (op_type, base_price_usdt, surge_enabled, surge_threshold, surge_multiplier, version, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(op_type) DO UPDATE SET
                    base_price_usdt = excluded.base_price_usdt,
                    surge_enabled = excluded.surge_enabled,
                    surge_threshold = excluded.surge_threshold,
                    surge_multiplier = excluded.surge_multiplier,
                    version = version + 1,
                    updated_at = excluded.updated_at
            `, [op_type, base_price_usdt, surge_enabled ? 1 : 0, surge_threshold || 1000, surge_multiplier || 1.0, now]);

            // Audit trail
            await auditLog('pricing_update', req.user?.wallet || 'super_admin', {
                op_type, base_price_usdt, surge_enabled, surge_threshold, surge_multiplier
            });

            res.json({ ok: true, message: `Pricing updated for ${op_type}`, audited: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/revenue/pricing
    router.get('/pricing', async (req, res) => {
        try {
            const rules = await db.query("SELECT * FROM pricing_rules");
            const legacy = await db.query("SELECT * FROM ops_pricing");
            res.json({ ok: true, rules, legacy });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/revenue/stats — 24h revenue snapshot
    router.get('/stats', async (req, res) => {
        try {
            const now = Date.now();
            const dayStart = now - 86400000;

            const revenue = await db.get(`
                SELECT SUM(amount_usdt) as total, COUNT(*) as ops,
                       AVG(surge_multiplier) as avg_surge,
                       COUNT(CASE WHEN surge_multiplier > 1 THEN 1 END) as surge_ops
                FROM revenue_events_v2 
                WHERE created_at > ?
            `, [dayStart]);

            res.json({
                ok: true,
                revenue_24h: revenue?.total || 0,
                ops_24h: revenue?.ops || 0,
                avg_surge: revenue?.avg_surge || 1.0,
                surge_ops_24h: revenue?.surge_ops || 0
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/revenue/commissions
    router.get('/commissions', async (req, res) => {
        try {
            const { GrowthEngine } = await import('../services/growth_engine.js');
            const engine = new GrowthEngine(db);
            await engine.processCommissions();
            const stats = await engine.getCommissionsStats();
            const fraud = await engine.detectCommissionFraud();
            res.json({ ok: true, stats, fraud });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/revenue/acquisition
    router.get('/acquisition', async (req, res) => {
        try {
            const { GrowthEngine } = await import('../services/growth_engine.js');
            const engine = new GrowthEngine(db);
            const stats = await engine.trackAcquisition();
            res.json({ ok: true, data: stats });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/revenue/profitability
    router.get('/profitability', async (req, res) => {
        try {
            const { GrowthEngine } = await import('../services/growth_engine.js');
            const engine = new GrowthEngine(db);
            const report = await engine.calculateNodeProfitability();
            res.json({ ok: true, data: report });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/revenue/unit-economics
    router.get('/unit-economics', async (req, res) => {
        try {
            const { GrowthEngine } = await import('../services/growth_engine.js');
            const engine = new GrowthEngine(db);
            const period = req.query.period || '7d';
            const stats = await engine.analyzeUnitEconomics(period);
            res.json({ ok: true, data: stats });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
