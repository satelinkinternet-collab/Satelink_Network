import { Router } from 'express';
import { sseHelper } from '../../utils/sse.js';
import { SSEManager } from '../../utils/sse_manager.js';
import { requireJWT } from '../../security/auth_middleware.js';

const sseManager = new SSEManager();

export function createStreamApiRouter(opsEngine) {
    const router = Router();
    const db = opsEngine?.db || global.opsEngine?.db;

    const pollDB = async (query, params = []) => {
        try {
            return await db.query(query, params);
        } catch (e) {
            console.error('[SSE] Poll Error:', e.message);
            return [];
        }
    };

    const pollGet = async (query, params = []) => {
        try {
            return await db.get(query, params);
        } catch (e) {
            console.error('[SSE] Poll Get Error:', e.message);
            return null;
        }
    };

    const getSystemFlags = async () => {
        try {
            const rows = await db.query('SELECT * FROM system_flags');
            return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        } catch (_) {
            return {};
        }
    };

    router.get('/admin', requireJWT, async (req, res) => {
        if (!['admin_super', 'admin_ops', 'admin_readonly'].includes(req.user?.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!sseManager.add(req, res)) {
            return res.status(429).json({ error: 'Too many active SSE connections' });
        }

        const conn = sseHelper.init(req, res);
        if (!conn) return;

        conn.send('hello', { server: 'satelink-admin', version: '1.0', ts: Date.now() });

        let lastRevenueId = 0;
        let lastErrorTs = Date.now() - 60000;
        let lastAlertTs = Date.now() - 60000;
        let lastAuditTs = Date.now() - 60000;
        let lastSlowQueryTs = Date.now() - 60000;
        let lastIncidentTs = Date.now() - 60000;

        const sendSnapshot = async () => {
            try {
                const flags = await getSystemFlags();
                const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
                const dayAgo = Math.floor(Date.now() / 1000) - 86400;
                const hourAgoMs = Date.now() - 3600000;

                const [activeNodes, opsCount, revenue24h, alertsOpen, errors1h, slowQueries1h, incidentsOpen] = await Promise.all([
                    pollGet('SELECT COUNT(*) as c FROM registered_nodes WHERE active = 1 AND last_heartbeat > ?', [fiveMinAgo]),
                    pollGet('SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?', [fiveMinAgo]),
                    pollGet('SELECT COALESCE(SUM(amount_usdt), 0) as t FROM revenue_events_v2 WHERE created_at > ?', [dayAgo]),
                    pollGet("SELECT COUNT(*) as c FROM security_alerts WHERE status = 'open'"),
                    pollGet('SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?', [hourAgoMs]),
                    pollGet('SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?', [hourAgoMs]),
                    pollGet("SELECT COUNT(*) as c FROM incident_bundles WHERE status = 'open'"),
                ]);

                const treasury = await opsEngine.getTreasuryAvailable();

                conn.send('snapshot', {
                    system: {
                        withdrawals_paused: flags.withdrawals_paused === '1',
                        security_freeze: flags.security_freeze === '1',
                        revenue_mode: flags.revenue_mode || 'ACTIVE',
                    },
                    kpis: {
                        active_nodes_5m: activeNodes?.c || 0,
                        ops_5m: opsCount?.c || 0,
                        revenue_24h_usdt: Number(revenue24h?.t || 0).toFixed(2),
                        treasury_balance: Number(treasury || 0).toFixed(2),
                    },
                    alerts_open_count: alertsOpen?.c || 0,
                    errors_1h_count: errors1h?.c || 0,
                    slow_queries_1h_count: slowQueries1h?.c || 0,
                    incidents_open_count: incidentsOpen?.c || 0,
                    timestamp: Date.now(),
                });
            } catch (e) {
                console.error('[SSE] Snapshot Error:', e.message);
            }
        };

        await sendSnapshot();

        const pollSnapshot = setInterval(sendSnapshot, 10000);

        const pollRevenue = setInterval(async () => {
            const events = await pollDB(
                'SELECT * FROM revenue_events_v2 WHERE id > ? ORDER BY id ASC LIMIT 10',
                [lastRevenueId]
            );
            if (events.length > 0) {
                lastRevenueId = events[events.length - 1].id;
                conn.send('revenue_batch', events);
            }
        }, 10000);

        const pollErrors = setInterval(async () => {
            const errors = await pollDB(
                'SELECT * FROM error_events WHERE last_seen_at > ? ORDER BY last_seen_at ASC LIMIT 10',
                [lastErrorTs]
            );
            if (errors.length > 0) {
                lastErrorTs = errors[errors.length - 1].last_seen_at;
                conn.send('error_batch', errors);
            }
        }, 10000);

        const pollAlerts = setInterval(async () => {
            const alerts = await pollDB(
                'SELECT * FROM security_alerts WHERE created_at > ? ORDER BY created_at ASC LIMIT 10',
                [lastAlertTs]
            );
            if (alerts.length > 0) {
                lastAlertTs = alerts[alerts.length - 1].created_at;
                conn.send('security_alerts', alerts);
            }
        }, 10000);

        const pollAudit = setInterval(async () => {
            const logs = await pollDB(
                'SELECT * FROM admin_audit_log WHERE created_at > ? ORDER BY created_at ASC LIMIT 10',
                [lastAuditTs]
            );
            if (logs.length > 0) {
                lastAuditTs = logs[logs.length - 1].created_at;
                conn.send('audit', logs);
            }
        }, 10000);

        const pollSlowQueries = setInterval(async () => {
            const queries = await pollDB(
                'SELECT * FROM slow_queries WHERE last_seen_at > ? ORDER BY last_seen_at ASC LIMIT 10',
                [lastSlowQueryTs]
            );
            if (queries.length > 0) {
                lastSlowQueryTs = queries[queries.length - 1].last_seen_at;
                conn.send('slow_query_batch', queries);
            }
        }, 10000);

        const pollIncidents = setInterval(async () => {
            const incidents = await pollDB(
                'SELECT * FROM incident_bundles WHERE created_at > ? ORDER BY created_at ASC LIMIT 10',
                [lastIncidentTs]
            );
            if (incidents.length > 0) {
                lastIncidentTs = incidents[incidents.length - 1].created_at;
                conn.send('incident', incidents);
            }
        }, 10000);

        req.on('close', () => {
            clearInterval(pollSnapshot);
            clearInterval(pollRevenue);
            clearInterval(pollErrors);
            clearInterval(pollAlerts);
            clearInterval(pollAudit);
            clearInterval(pollSlowQueries);
            clearInterval(pollIncidents);
        });
    });

    router.get('/node', requireJWT, async (req, res) => {
        if (req.user?.role !== 'node_operator') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const wallet = req.user.wallet;

        if (!sseManager.add(req, res)) {
            return res.status(429).json({ error: 'Too many active SSE connections' });
        }

        const conn = sseHelper.init(req, res);
        if (!conn) return;

        const formatUptime = (lastSeen) => {
            if (!lastSeen) return '0d 0h 0m';
            const s = Math.max(0, Math.floor(Date.now() / 1000) - Number(lastSeen));
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            return `${d}d ${h}h ${m}m`;
        };

        let lastLogId = 0;
        try {
            const latest = await pollGet(
                'SELECT COALESCE(MAX(id), 0) as max_id FROM revenue_events_v2 WHERE node_id = ?',
                [wallet]
            );
            lastLogId = Number(latest?.max_id || 0);
        } catch (_) {
            lastLogId = 0;
        }

        const pollHeartbeat = setInterval(async () => {
            try {
                const node = await pollGet(
                    'SELECT wallet, active, last_heartbeat FROM registered_nodes WHERE wallet = ?',
                    [wallet]
                );
                const unpaid = await pollDB(
                    "SELECT amount_usdt FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'",
                    [wallet]
                );

                const claimable = unpaid.reduce((sum, row) => sum + Number(row.amount_usdt || 0), 0);
                const nowSec = Math.floor(Date.now() / 1000);
                const lastHeartbeat = Number(node?.last_heartbeat || 0);
                const isOnline = Boolean(node?.active) || (lastHeartbeat > 0 && nowSec - lastHeartbeat < 300);

                const recentOpsRow = await pollGet(
                    'SELECT COUNT(*) as c FROM revenue_events_v2 WHERE node_id = ? AND created_at > ?',
                    [wallet, nowSec - 10]
                );
                const recentOps = Number(recentOpsRow?.c || 0);
                const pointLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                conn.send('heartbeat', {
                    online: isOnline,
                    uptime: formatUptime(lastHeartbeat),
                    earnings: Number(claimable.toFixed(2)),
                    lastPing: lastHeartbeat ? lastHeartbeat * 1000 : Date.now(),
                    telemetry_point: {
                        t: pointLabel,
                        earned: Number(claimable.toFixed(2)),
                        bw: recentOps,
                    },
                });
            } catch (e) {
                console.error('[SSE] Node heartbeat error:', e.message);
            }
        }, 10000);

        const pollLogs = setInterval(async () => {
            const events = await pollDB(
                'SELECT id, op_type, amount_usdt FROM revenue_events_v2 WHERE node_id = ? AND id > ? ORDER BY id ASC LIMIT 5',
                [wallet, lastLogId]
            );

            for (const event of events) {
                conn.send('log', { message: `[RELAY] ${event.op_type} -> $${event.amount_usdt}` });
                lastLogId = event.id;
            }
        }, 10000);

        req.on('close', () => {
            clearInterval(pollHeartbeat);
            clearInterval(pollLogs);
        });
    });

    router.get('/builder', requireJWT, async (req, res) => {
        if (req.user?.role !== 'builder') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const wallet = req.user.wallet;

        if (!sseManager.add(req, res)) {
            return res.status(429).json({ error: 'Too many active SSE connections' });
        }

        const conn = sseHelper.init(req, res);
        if (!conn) return;

        let lastUsageId = 0;

        const pollUsage = setInterval(async () => {
            const events = await pollDB(
                'SELECT * FROM revenue_events_v2 WHERE client_id = ? AND id > ? ORDER BY id ASC LIMIT 5',
                [wallet, lastUsageId]
            );

            if (events.length > 0) {
                lastUsageId = events[events.length - 1].id;
                conn.send('usage_log', events);
            }
        }, 10000);

        req.on('close', () => {
            clearInterval(pollUsage);
        });
    });

    return router;
}
