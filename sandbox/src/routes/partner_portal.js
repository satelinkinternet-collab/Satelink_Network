import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase P+Q — Partner Portal Routes
 * Mounted at /partner (behind verifyJWT)
 */
export function createPartnerPortalRouter(db, slaEngine = null) {
    const router = Router();

    // Middleware: Resolve partner from JWT wallet
    const requirePartner = async (req, res, next) => {
        try {
            const wallet = req.user?.wallet;
            if (!wallet) return res.status(401).json({ ok: false, error: "No wallet in token" });

            const partner = await db.get("SELECT * FROM partner_registry WHERE wallet = ?", [wallet]);
            if (!partner) {
                if (req.path === '/register') return next();
                return res.status(403).json({ ok: false, error: "Not a registered partner" });
            }
            req.partner = partner;
            next();
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    };

    // ─── OVERVIEW ─────────────────────────────────────────────────

    router.get('/overview', requirePartner, async (req, res) => {
        const p = req.partner;
        res.json({
            ok: true,
            partner: {
                id: p.partner_id,
                name: p.partner_name,
                status: p.status,
                total_ops: p.total_ops || 0,
                revenue_share_percent: p.revenue_share_percent
            }
        });
    });

    // ─── REGISTER ─────────────────────────────────────────────────

    router.post('/register', async (req, res) => {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ ok: false, error: "Name required" });

            const wallet = req.user.wallet;
            const existing = await db.get("SELECT * FROM partner_registry WHERE wallet = ?", [wallet]);
            if (existing) return res.status(400).json({ ok: false, error: "Already a partner" });

            const partnerId = `PARTNER-${Date.now()}`;
            const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
            const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

            await db.query(`
                INSERT INTO partner_registry (partner_id, partner_name, wallet, api_key_hash, status, created_at, total_ops, rate_limit_per_min, revenue_share_percent)
                VALUES (?, ?, ?, ?, 'active', ?, 0, 60, 10)
            `, [partnerId, name, wallet, hash, Date.now()]);

            res.json({ ok: true, partner_id: partnerId, api_key: apiKey });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─── KEY ROTATION ─────────────────────────────────────────────

    router.post('/keys/rotate', requirePartner, async (req, res) => {
        const newKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
        const hash = crypto.createHash('sha256').update(newKey).digest('hex');
        await db.query("UPDATE partner_registry SET api_key_hash = ?, updated_at = ? WHERE partner_id = ?",
            [hash, Date.now(), req.partner.partner_id]);
        res.json({ ok: true, api_key: newKey });
    });

    // ─── WEBHOOKS ─────────────────────────────────────────────────

    router.get('/webhooks', requirePartner, async (req, res) => {
        try {
            const hooks = await db.query("SELECT * FROM partner_webhooks WHERE partner_id = ?", [req.partner.partner_id]);
            res.json({ ok: true, webhooks: hooks });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/webhooks', requirePartner, async (req, res) => {
        try {
            const { url, events, secret } = req.body;
            if (!url || !events || !Array.isArray(events)) {
                return res.status(400).json({ ok: false, error: "url and events[] required" });
            }
            const id = uuidv4();
            const finalSecret = secret || crypto.randomBytes(32).toString('hex');
            await db.query(`
                INSERT INTO partner_webhooks (id, partner_id, url, secret_hash, events_json, enabled, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            `, [id, req.partner.partner_id, url, finalSecret, JSON.stringify(events), Date.now()]);
            res.json({ ok: true, id, secret: finalSecret });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.delete('/webhooks/:id', requirePartner, async (req, res) => {
        await db.query("DELETE FROM partner_webhooks WHERE id = ? AND partner_id = ?", [req.params.id, req.partner.partner_id]);
        res.json({ ok: true });
    });

    router.get('/webhooks/delivery', requirePartner, async (req, res) => {
        const history = await db.query(`
            SELECT a.*, w.url FROM webhook_delivery_attempts a
            JOIN partner_webhooks w ON a.webhook_id = w.id
            WHERE w.partner_id = ?
            ORDER BY a.created_at DESC LIMIT 50
        `, [req.partner.partner_id]);
        res.json({ ok: true, history });
    });

    // ─── Q2: SLA HEALTH ──────────────────────────────────────────

    router.get('/sla', requirePartner, async (req, res) => {
        if (!slaEngine) return res.status(501).json({ ok: false, error: "SLA not configured" });
        try {
            const budget = await slaEngine.getErrorBudget(req.partner.partner_id);
            const circuit = await db.get("SELECT * FROM tenant_circuit_state WHERE partner_id = ?", [req.partner.partner_id]);
            res.json({ ok: true, ...budget, circuit });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q3: PER-OP SLO ──────────────────────────────────────────

    router.get('/slo', requirePartner, async (req, res) => {
        if (!slaEngine) return res.status(501).json({ ok: false, error: "SLA not configured" });
        try {
            const days = parseInt(req.query.days) || 30;
            const slo = await slaEngine.getOpSLO(req.partner.partner_id, days);
            res.json({ ok: true, slo });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q5: REPORT EXPORT ───────────────────────────────────────

    router.get('/sla/report', requirePartner, async (req, res) => {
        if (!slaEngine) return res.status(501).json({ ok: false, error: "SLA not configured" });
        try {
            const month = req.query.month;
            if (!month || !/^\d{6}$/.test(month)) {
                return res.status(400).json({ ok: false, error: "month param required (YYYYMM)" });
            }
            const report = await slaEngine.getReport(req.partner.partner_id, month);
            res.json({ ok: true, report });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q6: CREDITS ─────────────────────────────────────────────

    router.get('/sla/credits', requirePartner, async (req, res) => {
        if (!slaEngine) return res.status(501).json({ ok: false, error: "SLA not configured" });
        try {
            const credits = await slaEngine.getCredits(req.partner.partner_id);
            res.json({ ok: true, credits });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    return router;
}
