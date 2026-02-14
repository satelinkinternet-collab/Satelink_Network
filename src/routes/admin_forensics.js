import { Router } from 'express';

export function createAdminForensicsRouter(db, forensicsServices) {
    const router = Router();
    const { snapshotService, replayEngine, auditService, integrityJob } = forensicsServices;

    // ─── SNAPSHOTS ───
    router.get('/snapshots', async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const snapshots = await snapshotService.getSnapshots(days);
            res.json({ ok: true, snapshots });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.get('/snapshots/:day', async (req, res) => {
        try {
            const snapshot = await snapshotService.getSnapshot(req.params.day);
            if (!snapshot) return res.status(404).json({ ok: false, error: "Snapshot not found" });
            res.json({ ok: true, snapshot: { ...snapshot, totals: JSON.parse(snapshot.totals_json) } });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/snapshot/run', async (req, res) => {
        try {
            const { day } = req.body;
            const hashProof = await snapshotService.runDailySnapshot(day);
            res.json({ ok: true, hashProof });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── REPLAY ───
    router.get('/replay', async (req, res) => {
        try {
            const { from_ts, to_ts, partner_id, node_id } = req.query;
            if (!from_ts || !to_ts) return res.status(400).json({ ok: false, error: "Missing from_ts or to_ts" });

            const result = await replayEngine.replayWindow({
                from_ts: parseInt(from_ts),
                to_ts: parseInt(to_ts),
                partner_id,
                node_id
            });
            res.json(result);
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── INTEGRITY ───
    router.get('/integrity', async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const runs = await db.query(
                "SELECT * FROM ledger_integrity_runs ORDER BY day_yyyymmdd DESC LIMIT ?",
                [days]
            );
            res.json({ ok: true, runs: runs.map(r => ({ ...r, findings: JSON.parse(r.findings_json) })) });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/integrity/run', async (req, res) => {
        try {
            const day = req.body.day || parseInt(new Date().toISOString().split('T')[0].replace(/-/g, ''));
            const result = await integrityJob.runDailyCheck(day);
            res.json({ ok: true, result });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── DISPUTES ───
    router.get('/disputes', async (req, res) => {
        try {
            const { status } = req.query;
            let sql = "SELECT * FROM partner_disputes ORDER BY created_at DESC";
            const params = [];
            if (status) { sql = "SELECT * FROM partner_disputes WHERE status = ? ORDER BY created_at DESC"; params.push(status); }

            const disputes = await db.query(sql, params);
            res.json({ ok: true, disputes });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/disputes', async (req, res) => {
        try {
            const { partner_id, from_ts, to_ts, reason } = req.body;

            // Auto-run replay
            const report = await replayEngine.replayWindow({ from_ts, to_ts, partner_id });

            const now = Date.now();
            await db.query(`
                INSERT INTO partner_disputes (partner_id, from_ts, to_ts, reason, status, created_at, created_by, forensic_report_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [partner_id, from_ts, to_ts, reason, 'investigating', now, req.user.wallet, JSON.stringify(report)]);

            // Audit
            await auditService.logAction({
                actor_wallet: req.user.wallet,
                action_type: 'CREATE_DISPUTE',
                target_type: 'PARTNER',
                target_id: partner_id,
                after_json: JSON.stringify({ from_ts, to_ts, reason })
            });

            res.json({ ok: true, note: "Dispute created and forensic report generated" });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/disputes/:id/resolve', async (req, res) => {
        try {
            const { notes } = req.body;
            await db.query(
                "UPDATE partner_disputes SET status = 'resolved', resolution_notes = ?, resolved_at = ?, resolved_by = ? WHERE id = ?",
                ['resolved', notes, Date.now(), req.user.wallet, req.params.id]
            );
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── SECURITY / AUDIT VERIFY ───
    router.get('/security/audit/verify', async (req, res) => {
        try {
            const result = await auditService.verifyChain();
            res.json(result);
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    return router;
}
