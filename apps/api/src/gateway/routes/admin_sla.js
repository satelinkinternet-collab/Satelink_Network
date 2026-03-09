import { Router } from 'express';

/**
 * Phase Q — Admin SLA Routes
 * Mounted at /admin/partners (alongside existing admin_partners.js)
 */
export function createAdminSLARouter(db, slaEngine) {
    const router = Router();

    // ─── Q1: Plans ───────────────────────────────────────────────

    router.get('/sla/plans', async (req, res) => {
        try {
            const plans = await slaEngine.getPlans();
            res.json({ ok: true, plans });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q1: Limits ──────────────────────────────────────────────

    router.get('/:id/limits', async (req, res) => {
        try {
            const limits = await slaEngine.getLimits(req.params.id);
            const circuit = await db.get("SELECT * FROM tenant_circuit_state WHERE partner_id = ?", [req.params.id]);
            res.json({ ok: true, limits, circuit });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/:id/limits', async (req, res) => {
        try {
            const result = await slaEngine.setLimits(req.params.id, req.body);

            // Audit
            await db.query(
                "INSERT INTO audit_logs (actor_wallet, action_type, metadata, created_at) VALUES (?, ?, ?, ?)",
                [req.user?.wallet || 'admin', 'SET_TENANT_LIMITS',
                JSON.stringify({ partner_id: req.params.id, ...req.body }), Date.now()]
            );

            res.json(result);
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q2: SLA Dashboard ───────────────────────────────────────

    router.get('/sla', async (req, res) => {
        try {
            const partners = await db.query("SELECT partner_id FROM tenant_limits");
            const results = [];

            for (const p of partners) {
                const budget = await slaEngine.getErrorBudget(p.partner_id);
                const circuit = await db.get("SELECT state, reason FROM tenant_circuit_state WHERE partner_id = ?", [p.partner_id]);
                const info = await db.get("SELECT partner_name, status FROM partner_registry WHERE partner_id = ?", [p.partner_id]);
                results.push({
                    ...budget,
                    name: info?.partner_name || p.partner_id,
                    status: info?.status || 'unknown',
                    circuit_state: circuit?.state || 'closed',
                    circuit_reason: circuit?.reason
                });
            }

            res.json({ ok: true, partners: results });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q3: Per-Op SLO ──────────────────────────────────────────

    router.get('/:id/slo', async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const slo = await slaEngine.getOpSLO(req.params.id, days);
            res.json({ ok: true, slo });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q5: Report Export ───────────────────────────────────────

    router.get('/:id/sla/report', async (req, res) => {
        try {
            const month = req.query.month;
            if (!month || !/^\d{6}$/.test(month)) {
                return res.status(400).json({ ok: false, error: "month param required (YYYYMM)" });
            }

            const format = req.query.format || 'json';
            const report = await slaEngine.getReport(req.params.id, month);

            if (format === 'csv') {
                // Build CSV from daily data
                let csv = 'day,total_ops,failed_ops,success_rate,p95_latency_ms\n';
                for (const d of (report.daily || [])) {
                    csv += `${d.day},${d.ops},${d.fails},${d.sr},${d.p95}\n`;
                }
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=sla_${req.params.id}_${month}.csv`);
                return res.send(csv);
            }

            res.json({ ok: true, report });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── Q6: Credits (Admin view) ────────────────────────────────

    router.get('/:id/sla/credits', async (req, res) => {
        try {
            const credits = await slaEngine.getCredits(req.params.id);
            res.json({ ok: true, credits });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/:id/sla/credits', async (req, res) => {
        try {
            const { amount_usdt, reason } = req.body;
            if (!amount_usdt || !reason) return res.status(400).json({ ok: false, error: "amount_usdt and reason required" });
            const credit = await slaEngine.issueCredit(req.params.id, amount_usdt, reason);
            res.json({ ok: true, credit });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    return router;
}
