
import { Router } from "express";

export function createOpsRouter(opsEngine, adminAuth) {
    const router = Router();

    // 1. Status Endpoint
    router.get('/ops/status', adminAuth, async (req, res) => {
        try {
            const safeMode = await opsEngine.db.get("SELECT value FROM system_config WHERE key = 'system_state'");
            const schedulerRunning = req.scheduler ? req.scheduler.isRunning : false;

            // Check DB
            let dbStatus = "OK";
            try { await opsEngine.db.get("SELECT 1"); } catch (e) { dbStatus = "FAIL"; }

            // Last Distrib
            const lastDist = await opsEngine.db.get("SELECT * FROM distribution_runs ORDER BY created_at DESC LIMIT 1");

            // Webhook Failures (Counter in memory or DB?)
            // Requirement says "webhook failure count"
            // Let's check logs for recent failures if we don't have a counter?
            // "Track: failed webhook attempts"
            // Let's implement a simple counter on the `req.alertService` or `req`?
            // Better: Query recent error logs for webhooks
            const errors = await req.logger.db.get("SELECT COUNT(*) as c FROM webhook_logs WHERE status != 'applied' AND ts > ?", [Date.now() - 300000]); // last 5 mins

            res.json({
                scheduler_running: schedulerRunning,
                safe_mode: safeMode?.value === 'SAFE_MODE',
                system_state: safeMode?.value || 'LIVE',
                last_distribution_status: lastDist || null,
                webhook_failure_count_5m: errors?.c || 0,
                db_status: dbStatus,
                timestamp: Date.now()
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 2. Safe Mode Toggle (Manual)
    router.post('/ops/safe-mode', adminAuth, async (req, res) => {
        try {
            const { reason } = req.body;
            await opsEngine.setSafeMode(reason || "Manual Admin Override");
            if (req.scheduler) req.scheduler.stop();
            if (req.alertService) await req.alertService.send(`🚨 MANUAL SAFE MODE ENABLED: ${reason}`, 'warn');

            res.json({ ok: true, mode: 'SAFE_MODE' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ─── PHASE A: PAID OPS EXECUTION ──────────────────────────
    router.post('/ops/execute', async (req, res) => {
        try {
            const { op_type, node_id, client_id, request_id, timestamp, payload_hash, signature } = req.body;

            // Minimal validation
            if (!op_type || !node_id || !client_id || !request_id) {
                return res.status(400).json({ ok: false, error: "Missing required fields" });
            }

            // Execute logic via engine
            const result = await opsEngine.executeOp({
                op_type, node_id, client_id, request_id, timestamp, payload_hash
            });

            console.log(`[REVENUE] OpExecuted: ${op_type} by ${client_id} on ${node_id}. Paid: ${result.amount} USDT`);
            res.json(result);
        } catch (e) {
            console.error(`[OPS-ERROR] ${e.message}`);
            res.status(e.message.includes("rate limit") ? 429 : 500).json({ ok: false, error: e.message });
        }
    });

    // ─── PHASE C: CLAIM/WITHDRAW FEED ──────────────────────────
    router.get('/epochs/:id/earnings', async (req, res) => {
        try {
            const ledger = await opsEngine.getLedger(req.params.id);
            res.json({ ok: true, epochId: req.params.id, ledger });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/me/claimable', async (req, res) => {
        try {
            const { wallet } = req.query;
            if (!wallet) return res.status(400).json({ error: "Wallet required" });

            const bal = await opsEngine.getBalance(wallet);
            const isSafe = await opsEngine.isSystemSafe();

            res.json({
                ok: true,
                wallet,
                claimable_usdt: bal,
                can_withdraw: isSafe && bal > 0,
                treasury_safe: isSafe
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/treasury/status', async (req, res) => {
        try {
            const status = await opsEngine.monitorTreasuryBalance();
            res.json({ ok: true, ...status });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ─── PHASE D: AUDIT EXPORTS ───────────────────────────────
    router.get('/ops/export', adminAuth, async (req, res) => {
        try {
            const { target } = req.query; // 'revenue', 'earnings', 'epochs'
            let data = [];

            if (target === 'revenue') {
                data = await opsEngine.db.query("SELECT * FROM revenue_events_v2 ORDER BY id DESC LIMIT 1000");
            } else if (target === 'earnings') {
                data = await opsEngine.db.query("SELECT * FROM epoch_earnings ORDER BY created_at DESC LIMIT 1000");
            } else {
                data = await opsEngine.db.query("SELECT * FROM epochs ORDER BY id DESC LIMIT 100");
            }

            const format = req.query.format || 'json';
            if (format === 'csv') {
                if (data.length === 0) return res.send("");
                const keys = Object.keys(data[0]);
                const csv = [
                    keys.join(','),
                    ...data.map(row => keys.map(k => JSON.stringify(row[k])).join(','))
                ].join('\n');
                res.header('Content-Type', 'text/csv');
                res.attachment(`export_${target || 'epochs'}.csv`);
                return res.send(csv);
            }

            res.json({ ok: true, target, count: data.length, data });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
}
