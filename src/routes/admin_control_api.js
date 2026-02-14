import { Router } from 'express';

export function createAdminControlRouter(opsEngine) {
    const router = Router();
    const db = opsEngine.db;

    // ─── COMMAND CENTER ───
    router.get('/command/summary', async (req, res) => {
        try {
            // System State
            const flags = await db.query("SELECT key, value FROM system_flags");
            const flagsMap = flags.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

            // KPIs (Last 5 mins)
            const fiveMinsAgo = Math.floor(Date.now() / 1000) - 300;
            const opsCount = (await db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?", [fiveMinsAgo])).c;
            const activeNodes = (await db.get("SELECT COUNT(*) as c FROM nodes WHERE last_seen > ?", [fiveMinsAgo])).c;

            // Revenue 24h
            const dayAgo = Math.floor(Date.now() / 1000) - 86400;
            const revenue24h = (await db.get("SELECT SUM(amount_usdt) as t FROM revenue_events_v2 WHERE created_at > ?", [dayAgo])).t || 0;

            // Counts form monitoring tables
            const alertsOpen = (await db.get("SELECT COUNT(*) as c FROM security_alerts WHERE status = 'open'")).c;
            const errors1h = (await db.get("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?", [Date.now() - 3600000])).c;
            const slowQueries1h = (await db.get("SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?", [Date.now() - 3600000])).c;

            res.json({
                ok: true,
                system: {
                    withdrawals_paused: flagsMap.withdrawals_paused === '1',
                    security_freeze: flagsMap.security_freeze === '1',
                    revenue_mode: flagsMap.revenue_mode || 'ACTIVE'
                },
                kpis: {
                    active_nodes_5m: activeNodes,
                    ops_5m: opsCount,
                    revenue_24h_usdt: revenue24h.toFixed(2),
                    success_rate_5m: 99.9 // Placeholder until we track failures better
                },
                alerts_open_count: alertsOpen,
                errors_1h_count: errors1h,
                slow_queries_1h_count: slowQueries1h
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/command/live-feed', async (req, res) => {
        try {
            const limit = 50;
            // Combined feed is expensive, for MVP we fetch separate and merge in memory or just return latest events
            // We'll return just the Revenue Events and Errors for now as the "Feed"
            const revenue = await db.query("SELECT 'revenue' as type, id, amount_usdt as val, created_at, op_type as label FROM revenue_events_v2 ORDER BY created_at DESC LIMIT ?", [limit]);
            const errors = await db.query("SELECT 'error' as type, id, status_code as val, last_seen_at as created_at, message as label FROM error_events ORDER BY last_seen_at DESC LIMIT ?", [limit]);

            // Normalize dates (revenue is seconds, error is ms)
            const feed = [
                ...revenue.map(r => ({ ...r, created_at: r.created_at * 1000 })),
                ...errors
            ].sort((a, b) => b.created_at - a.created_at).slice(0, limit);

            res.json({ ok: true, feed });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─── NETWORK ───
    router.get('/network/nodes', async (req, res) => {
        try {
            const nodes = await db.query("SELECT * FROM nodes ORDER BY last_seen DESC LIMIT 200");
            res.json({ ok: true, nodes });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── OPS MONITOR ───
    router.get('/ops/errors', async (req, res) => {
        try {
            const errors = await db.query("SELECT * FROM error_events ORDER BY last_seen_at DESC LIMIT 100");
            res.json({ ok: true, errors });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.get('/ops/traces', async (req, res) => {
        try {
            const traces = await db.query("SELECT * FROM request_traces ORDER BY created_at DESC LIMIT 100");
            res.json({ ok: true, traces });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── SECURITY ───
    router.get('/security/alerts', async (req, res) => {
        try {
            const alerts = await db.query("SELECT * FROM security_alerts ORDER BY created_at DESC LIMIT 100");
            res.json({ ok: true, alerts });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.post('/security/alerts/:id/triage', async (req, res) => {
        if (req.user.role !== 'admin_super' && req.user.role !== 'admin_ops') return res.sendStatus(403);
        const { id } = req.params;
        const { status, notes } = req.body;
        await db.query("UPDATE security_alerts SET status = ?, resolution_notes = ? WHERE id = ?", [status, notes, id]);
        res.json({ ok: true });
    });

    // ─── SETTINGS & CONTROLS ───
    router.post('/controls/pause-withdrawals', async (req, res) => {
        if (req.user.role !== 'admin_super' && req.user.role !== 'admin_ops') return res.sendStatus(403);
        const { paused } = req.body;

        await db.query("INSERT INTO system_flags (key, value, updated_by, updated_at) VALUES ('withdrawals_paused', ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
            [paused ? '1' : '0', req.user.wallet, Math.floor(Date.now() / 1000)]);

        await db.query("INSERT INTO admin_audit_log (actor_wallet, action_type, target_type, after_json, created_at) VALUES (?, 'PAUSE_WITHDRAWALS', 'SYSTEM', ?, ?)",
            [req.user.wallet, JSON.stringify({ paused }), Date.now()]);

        res.json({ ok: true });
    });

    return router;
}
