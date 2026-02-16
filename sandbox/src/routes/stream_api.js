import { Router } from 'express';
import { sseHelper } from '../utils/sse.js';
import { SSEManager } from '../services/sse_manager.js';

const sseManager = new SSEManager();

export function createStreamApiRouter(opsEngine) {
    const router = Router();

    /**
     * SHARED: Stream polling logic
     */
    const pollDB = async (query, params) => {
        try {
            return await opsEngine.db.query(query, params);
        } catch (e) {
            console.error("[SSE] Poll Error:", e.message);
            return [];
        }
    };

    const getSystemFlags = async () => {
        try {
            const rows = await opsEngine.db.query("SELECT * FROM system_flags");
            return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
        } catch (e) { return {}; }
    };

    /**
     * GET /stream/admin
     * Access: Admin only (admin_super, admin_ops, admin_readonly)
     * Emits: hello, snapshot, revenue_batch, error_batch, security_alerts, audit, ping
     */
    router.get('/admin', async (req, res) => {
        if (!['admin_super', 'admin_ops', 'admin_readonly'].includes(req.user?.role)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Anti-buffering headers (nginx/proxies)
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (!sseManager.add(req, res)) {
            return res.status(429).json({ error: "Too many active SSE connections" });
        }

        const conn = sseHelper.init(req, res);

        // ── Hello event (once) ──
        conn.send('hello', { server: 'satelink-admin', version: '1.0', ts: Date.now() });

        let lastRevenueId = 0;
        let lastErrorTs = Date.now() - 60000; // last minute
        let lastAlertTs = Date.now() - 60000;
        let lastAuditTs = Date.now() - 60000;
        let lastSlowQueryTs = Date.now() - 60000;
        let lastIncidentTs = Date.now() - 60000;

        // ── Send initial snapshot immediately ──
        const sendSnapshot = async () => {
            try {
                const flags = await getSystemFlags();
                const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
                const dayAgo = Math.floor(Date.now() / 1000) - 86400;
                const hourAgoMs = Date.now() - 3600000;

                const [activeNodes, opsCount, revenue24h, alertsOpen, errors1h, slowQueries1h, incidentsOpen] = await Promise.all([
                    opsEngine.db.get("SELECT COUNT(*) as c FROM nodes WHERE last_seen > ?", [fiveMinAgo]),
                    opsEngine.db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?", [fiveMinAgo]),
                    opsEngine.db.get("SELECT COALESCE(SUM(amount_usdt), 0) as t FROM revenue_events_v2 WHERE created_at > ?", [dayAgo]),
                    opsEngine.db.get("SELECT COUNT(*) as c FROM security_alerts WHERE status = 'open'"),
                    opsEngine.db.get("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?", [hourAgoMs]),
                    opsEngine.db.get("SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?", [hourAgoMs]),
                    opsEngine.db.get("SELECT COUNT(*) as c FROM incident_bundles WHERE status = 'open'"),
                ]);

                const treasury = await opsEngine.getTreasuryAvailable();

                conn.send('snapshot', {
                    system: {
                        withdrawals_paused: flags.withdrawals_paused === '1',
                        security_freeze: flags.security_freeze === '1',
                        revenue_mode: flags.revenue_mode || 'ACTIVE'
                    },
                    kpis: {
                        active_nodes_5m: activeNodes?.c || 0,
                        ops_5m: opsCount?.c || 0,
                        revenue_24h_usdt: parseFloat(revenue24h?.t || 0).toFixed(2),
                        treasury_balance: parseFloat(treasury || 0).toFixed(2)
                    },
                    alerts_open_count: alertsOpen?.c || 0,
                    errors_1h_count: errors1h?.c || 0,
                    slow_queries_1h_count: slowQueries1h?.c || 0,
                    incidents_open_count: incidentsOpen?.c || 0,
                    timestamp: Date.now()
                });
            } catch (e) { }
        };

        // Send immediately
        await sendSnapshot();

        // ── Snapshot every 10s ──
        const pollSnapshot = setInterval(sendSnapshot, 10000);

        // ── Revenue batch ──
        const pollRevenue = setInterval(async () => {
            try {
                const events = await pollDB(
                    `SELECT * FROM revenue_events_v2 WHERE id > ? ORDER BY id ASC LIMIT 10`,
                    [lastRevenueId]
                );
                if (events.length > 0) {
                    lastRevenueId = events[events.length - 1].id;
                    conn.send('revenue_batch', events);
                }
            } catch (e) { }
        }, 10000);

        // ── Error batch ──
        const pollErrors = setInterval(async () => {
            try {
                const errors = await pollDB(
                    `SELECT * FROM error_events WHERE last_seen_at > ? ORDER BY last_seen_at ASC LIMIT 10`,
                    [lastErrorTs]
                );
                if (errors.length > 0) {
                    lastErrorTs = errors[errors.length - 1].last_seen_at;
                    conn.send('error_batch', errors);
                }
            } catch (e) { }
        }, 10000);

        // ── Security alerts ──
        const pollAlerts = setInterval(async () => {
            try {
                const alerts = await pollDB(
                    `SELECT * FROM security_alerts WHERE created_at > ? ORDER BY created_at ASC LIMIT 10`,
                    [lastAlertTs]
                );
                if (alerts.length > 0) {
                    lastAlertTs = alerts[alerts.length - 1].created_at;
                    conn.send('security_alerts', alerts);
                }
            } catch (e) { }
        }, 10000);

        // ── Audit log ──
        const pollAudit = setInterval(async () => {
            try {
                const logs = await pollDB(
                    `SELECT * FROM admin_audit_log WHERE created_at > ? ORDER BY created_at ASC LIMIT 10`,
                    [lastAuditTs]
                );
                if (logs.length > 0) {
                    lastAuditTs = logs[logs.length - 1].created_at;
                    conn.send('audit', logs);
                }
            } catch (e) { }
        }, 10000);

        // ── Slow query batch ──
        const pollSlowQueries = setInterval(async () => {
            try {
                const queries = await pollDB(
                    `SELECT * FROM slow_queries WHERE last_seen_at > ? ORDER BY last_seen_at ASC LIMIT 10`,
                    [lastSlowQueryTs]
                );
                if (queries.length > 0) {
                    lastSlowQueryTs = queries[queries.length - 1].last_seen_at;
                    conn.send('slow_query_batch', queries);
                }
            } catch (e) { }
        }, 10000);

        // ── Incident bundles ──
        const pollIncidents = setInterval(async () => {
            try {
                const incidents = await pollDB(
                    `SELECT * FROM incident_bundles WHERE created_at > ? ORDER BY created_at ASC LIMIT 10`,
                    [lastIncidentTs]
                );
                if (incidents.length > 0) {
                    lastIncidentTs = incidents[incidents.length - 1].created_at;
                    conn.send('incident', incidents);
                }
            } catch (e) { }
        }, 10000);

        // ── Ping keepalive every 15s ──
        const pollPing = setInterval(() => {
            conn.send('ping', { ts: Date.now() });
        }, 15000);

        // Cleanup
        req.on('close', () => {
            clearInterval(pollSnapshot);
            clearInterval(pollRevenue);
            clearInterval(pollErrors);
            clearInterval(pollAlerts);
            clearInterval(pollAudit);
            clearInterval(pollSlowQueries);
            clearInterval(pollIncidents);
            clearInterval(pollPing);
        });
    });


    /**
     * GET /stream/node
     * Access: Node Operator (own node only)
     */
    router.get('/node', async (req, res) => {
        if (req.user?.role !== 'node_operator') {
            return res.status(403).json({ error: "Access denied" });
        }

        const wallet = req.user.wallet;

        if (!sseManager.add(req, res)) {
            return res.status(429).json({ error: "Too many active SSE connections" });
        }

        const conn = sseHelper.init(req, res);

        const pollStatus = setInterval(async () => {
            try {
                const node = await opsEngine.db.get("SELECT * FROM registered_nodes WHERE wallet = ?", [wallet]);
                if (node) {
                    const now = Math.floor(Date.now() / 1000);
                    const isOnline = (now - node.last_heartbeat) < 300;
                    conn.send('node_status', {
                        online: isOnline,
                        last_seen: node.last_heartbeat,
                        ip: '127.0.0.1'
                    });
                }
            } catch (e) { }
        }, 10000);

        const pollEarnings = setInterval(async () => {
            try {
                const total = await opsEngine.getBalance(wallet);
                const recent_earnings = await pollDB(
                    `SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? ORDER BY epoch_id DESC LIMIT 5`,
                    [wallet]
                );
                conn.send('earnings', {
                    unpaid_balance: total,
                    recent_epochs: recent_earnings || []
                });
            } catch (e) { }
        }, 10000);

        req.on('close', () => {
            clearInterval(pollStatus);
            clearInterval(pollEarnings);
        });
    });

    /**
     * GET /stream/builder
     * Access: Builder
     */
    router.get('/builder', async (req, res) => {
        if (req.user?.role !== 'builder') {
            return res.status(403).json({ error: "Access denied" });
        }

        const wallet = req.user.wallet;

        if (!sseManager.add(req, res)) {
            return res.status(429).json({ error: "Too many active SSE connections" });
        }

        const conn = sseHelper.init(req, res);
        let lastUsageId = 0;

        const pollUsage = setInterval(async () => {
            try {
                const events = await pollDB(
                    `SELECT * FROM revenue_events_v2 WHERE client_id = ? AND id > ? ORDER BY id ASC LIMIT 5`,
                    [wallet, lastUsageId]
                );
                if (events.length > 0) {
                    lastUsageId = events[events.length - 1].id;
                    conn.send('usage_log', events);
                }
            } catch (e) { }
        }, 10000);

        req.on('close', () => {
            clearInterval(pollUsage);
        });
    });

    return router;
}
