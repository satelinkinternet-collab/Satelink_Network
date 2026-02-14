import { Router } from 'express';
import crypto from 'crypto';

const IP_SALT = process.env.IP_HASH_SALT || 'satelink_default_salt_change_me';
const ADMIN_ROLES = ['admin_super', 'admin_ops', 'admin_readonly'];
const OPS_ROLES = ['admin_super', 'admin_ops'];
const SENSITIVE_KEYS = ['private_key', 'secret', 'token', 'password', 'jwt', 'api_key'];

// ─── Helpers ───────────────────────────────────────────────
function redactSensitive(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(result)) {
        if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
            result[key] = '***REDACTED***';
        } else if (typeof result[key] === 'object') {
            result[key] = redactSensitive(result[key]);
        }
    }
    return result;
}

function hashIp(ip) {
    return crypto.createHash('sha256').update((ip || '') + IP_SALT).digest('hex').substring(0, 16);
}

function parseIntParam(val, fallback) {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
}

async function auditLog(db, { actor, action, target_type, target_id, before, after, ip }) {
    try {
        await db.query(`
            INSERT INTO admin_audit_log (actor_wallet, action_type, target_type, target_id, before_json, after_json, ip_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [actor, action, target_type, target_id || null,
            before ? JSON.stringify(redactSensitive(before)) : null,
            after ? JSON.stringify(redactSensitive(after)) : null,
            hashIp(ip), Date.now()]);
    } catch (e) {
        console.error('[AuditLog] Error:', e.message);
    }
}

// ─── RBAC Middleware ────────────────────────────────────────
function requireAdmin(req, res, next) {
    if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ ok: false, error: 'Admin role required' });
    }
    next();
}

function requireOps(req, res, next) {
    if (!req.user || !OPS_ROLES.includes(req.user.role)) {
        return res.status(403).json({ ok: false, error: 'Admin ops role required' });
    }
    next();
}

function requireSuper(req, res, next) {
    if (!req.user || req.user.role !== 'admin_super') {
        return res.status(403).json({ ok: false, error: 'Super admin role required' });
    }
    next();
}

// ─── Router ────────────────────────────────────────────────
export function createAdminControlRoomRouter(opsEngine) {
    const router = Router();
    const db = opsEngine.db;

    // All routes require admin role
    router.use(requireAdmin);

    // ═══════════════════════════════════════════════════════
    // COMMAND CENTER
    // ═══════════════════════════════════════════════════════

    router.get('/command/summary', async (req, res) => {
        try {
            const flags = await db.query("SELECT key, value FROM system_flags");
            const flagsMap = flags.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});

            const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
            const dayAgo = Math.floor(Date.now() / 1000) - 86400;
            const hourAgoMs = Date.now() - 3600000;

            const [opsCount, activeNodes, successRate, revenue24h, alertsOpen, errors1h, slowQueries1h] =
                await Promise.all([
                    db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?", [fiveMinAgo]),
                    db.get("SELECT COUNT(*) as c FROM nodes WHERE last_seen > ?", [fiveMinAgo]),
                    db.get("SELECT ROUND(AVG(CASE WHEN status_code < 500 THEN 100.0 ELSE 0.0 END), 1) as rate FROM request_traces WHERE created_at > ?", [Date.now() - 300000]),
                    db.get("SELECT COALESCE(SUM(amount_usdt), 0) as t FROM revenue_events_v2 WHERE created_at > ?", [dayAgo]),
                    db.get("SELECT COUNT(*) as c FROM security_alerts WHERE status = 'open'"),
                    db.get("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?", [hourAgoMs]),
                    db.get("SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?", [hourAgoMs]),
                ]);

            const p95Row = await db.get("SELECT duration_ms FROM request_traces WHERE created_at > ? ORDER BY duration_ms DESC LIMIT 1 OFFSET (SELECT COUNT(*) * 5 / 100 FROM request_traces WHERE created_at > ?)", [Date.now() - 300000, Date.now() - 300000]);

            res.json({
                ok: true,
                system: {
                    withdrawals_paused: flagsMap.withdrawals_paused === '1',
                    security_freeze: flagsMap.security_freeze === '1',
                    revenue_mode: flagsMap.revenue_mode || 'ACTIVE'
                },
                kpis: {
                    active_nodes_5m: activeNodes?.c || 0,
                    ops_5m: opsCount?.c || 0,
                    success_rate_5m: successRate?.rate ?? 99.9,
                    p95_latency_ms_5m: p95Row?.duration_ms || 0,
                    revenue_24h_usdt: parseFloat(revenue24h?.t || 0).toFixed(2)
                },
                alerts_open_count: alertsOpen?.c || 0,
                errors_1h_count: errors1h?.c || 0,
                slow_queries_1h_count: slowQueries1h?.c || 0
            });
        } catch (e) {
            console.error('[Admin] command/summary error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/command/live-feed', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 100);
            const feedLimit = Math.min(limit, 200);

            const [revenue, errors, audit, alerts] = await Promise.all([
                db.query("SELECT 'revenue' as type, id, amount_usdt as value, created_at * 1000 as ts, op_type as label FROM revenue_events_v2 ORDER BY created_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'error' as type, id, status_code as value, last_seen_at as ts, message as label FROM error_events ORDER BY last_seen_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'audit' as type, id, action_type as value, created_at as ts, actor_wallet as label FROM admin_audit_log ORDER BY created_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'alert' as type, id, severity as value, created_at as ts, title as label FROM security_alerts ORDER BY created_at DESC LIMIT ?", [feedLimit]),
            ]);

            const feed = [...revenue, ...errors, ...audit, ...alerts]
                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                .slice(0, feedLimit);

            res.json({ ok: true, feed: redactSensitive(feed) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // NETWORK
    // ═══════════════════════════════════════════════════════

    router.get('/network/nodes', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { status, device_type } = req.query;

            let sql = "SELECT * FROM nodes WHERE 1=1";
            const params = [];

            if (status) {
                sql += " AND status = ?";
                params.push(status);
            }
            if (device_type) {
                sql += " AND device_type = ?";
                params.push(device_type);
            }

            sql += " ORDER BY last_seen DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const nodes = await db.query(sql, params);
            res.json({ ok: true, nodes: redactSensitive(nodes), count: nodes.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/network/nodes/:node_id', async (req, res) => {
        try {
            const { node_id } = req.params;
            const node = await db.get("SELECT * FROM nodes WHERE node_id = ?", [node_id]);
            if (!node) return res.status(404).json({ ok: false, error: 'Node not found' });

            const recentRevenue = await db.query("SELECT * FROM revenue_events_v2 WHERE node_id = ? ORDER BY created_at DESC LIMIT 20", [node_id]);

            // Try heartbeats
            let heartbeats = [];
            try {
                heartbeats = await db.query("SELECT * FROM registered_nodes WHERE wallet = ? LIMIT 1", [node_id]);
            } catch (_) { }

            res.json({
                ok: true,
                node: redactSensitive(node),
                recent_revenue: recentRevenue,
                heartbeats
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // OPS MONITOR
    // ═══════════════════════════════════════════════════════

    router.get('/ops/executions', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { op_type, status, client_id, node_id, from, to } = req.query;

            let sql = "SELECT * FROM revenue_events_v2 WHERE 1=1";
            const params = [];

            if (op_type) { sql += " AND op_type = ?"; params.push(op_type); }
            if (status) { sql += " AND status = ?"; params.push(status); }
            if (client_id) { sql += " AND client_id = ?"; params.push(client_id); }
            if (node_id) { sql += " AND node_id = ?"; params.push(node_id); }
            if (from) { sql += " AND created_at > ?"; params.push(parseIntParam(from, 0)); }
            if (to) { sql += " AND created_at < ?"; params.push(parseIntParam(to, Math.floor(Date.now() / 1000))); }

            sql += " ORDER BY created_at DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const executions = await db.query(sql, params);
            res.json({ ok: true, executions, count: executions.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/ops/errors', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { from, to, service } = req.query;

            let sql = "SELECT * FROM error_events WHERE 1=1";
            const params = [];

            if (service) { sql += " AND service = ?"; params.push(service); }
            if (from) { sql += " AND last_seen_at > ?"; params.push(parseIntParam(from, 0)); }
            if (to) { sql += " AND last_seen_at < ?"; params.push(parseIntParam(to, Date.now())); }

            sql += " ORDER BY last_seen_at DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const errors = await db.query(sql, params);
            res.json({ ok: true, errors: redactSensitive(errors), count: errors.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/ops/errors/:id', async (req, res) => {
        try {
            const error = await db.get("SELECT * FROM error_events WHERE id = ?", [req.params.id]);
            if (!error) return res.status(404).json({ ok: false, error: 'Error event not found' });

            // Try to find related traces
            let relatedTraces = [];
            if (error.trace_id) {
                relatedTraces = await db.query("SELECT * FROM request_traces WHERE trace_id = ?", [error.trace_id]);
            }

            res.json({ ok: true, error: redactSensitive(error), related_traces: relatedTraces });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/ops/slow-queries', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const queries = await db.query("SELECT * FROM slow_queries ORDER BY last_seen_at DESC LIMIT ?", [Math.min(limit, 500)]);
            res.json({ ok: true, queries: redactSensitive(queries), count: queries.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/ops/traces', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { trace_id, request_id, client_id, node_id, route } = req.query;

            let sql = "SELECT * FROM request_traces WHERE 1=1";
            const params = [];

            if (trace_id) { sql += " AND trace_id = ?"; params.push(trace_id); }
            if (request_id) { sql += " AND request_id = ?"; params.push(request_id); }
            if (client_id) { sql += " AND client_id = ?"; params.push(client_id); }
            if (node_id) { sql += " AND node_id = ?"; params.push(node_id); }
            if (route) { sql += " AND route LIKE ?"; params.push(`%${route}%`); }

            sql += " ORDER BY created_at DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const traces = await db.query(sql, params);
            res.json({ ok: true, traces: redactSensitive(traces), count: traces.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // REVENUE
    // ═══════════════════════════════════════════════════════

    router.get('/revenue/overview', async (req, res) => {
        try {
            const dayAgo = Math.floor(Date.now() / 1000) - 86400;
            const weekAgo = Math.floor(Date.now() / 1000) - 604800;

            const [total24h, totalWeek, byOpType, byClient, byNode] = await Promise.all([
                db.get("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE created_at > ?", [dayAgo]),
                db.get("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE created_at > ?", [weekAgo]),
                db.query("SELECT op_type, SUM(amount_usdt) as total, COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ? GROUP BY op_type ORDER BY total DESC", [weekAgo]),
                db.query("SELECT client_id, SUM(amount_usdt) as total, COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ? GROUP BY client_id ORDER BY total DESC LIMIT 20", [weekAgo]),
                db.query("SELECT node_id, SUM(amount_usdt) as total, COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ? GROUP BY node_id ORDER BY total DESC LIMIT 20", [weekAgo]),
            ]);

            res.json({
                ok: true,
                revenue_24h_usdt: parseFloat(total24h?.total || 0).toFixed(2),
                revenue_7d_usdt: parseFloat(totalWeek?.total || 0).toFixed(2),
                by_op_type: byOpType,
                by_client: redactSensitive(byClient),
                by_node: redactSensitive(byNode)
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/revenue/events', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { op_type, client_id, node_id, status, from, to } = req.query;

            let sql = "SELECT * FROM revenue_events_v2 WHERE 1=1";
            const params = [];

            if (op_type) { sql += " AND op_type = ?"; params.push(op_type); }
            if (client_id) { sql += " AND client_id = ?"; params.push(client_id); }
            if (node_id) { sql += " AND node_id = ?"; params.push(node_id); }
            if (status) { sql += " AND status = ?"; params.push(status); }
            if (from) { sql += " AND created_at > ?"; params.push(parseIntParam(from, 0)); }
            if (to) { sql += " AND created_at < ?"; params.push(parseIntParam(to, Math.floor(Date.now() / 1000))); }

            sql += " ORDER BY created_at DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const events = await db.query(sql, params);
            res.json({ ok: true, events: redactSensitive(events), count: events.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // REWARDS
    // ═══════════════════════════════════════════════════════

    router.get('/rewards/epochs', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const epochs = await db.query("SELECT * FROM epochs ORDER BY id DESC LIMIT ?", [limit]);
            res.json({ ok: true, epochs });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/rewards/epochs/:id/finalize', requireOps, async (req, res) => {
        try {
            const { id } = req.params;
            const epoch = await db.get("SELECT * FROM epochs WHERE id = ?", [id]);
            if (!epoch) return res.status(404).json({ ok: false, error: 'Epoch not found' });

            const before = { ...epoch };
            await db.query("UPDATE epochs SET status = 'FINALIZED', finalized_at = ? WHERE id = ?", [Math.floor(Date.now() / 1000), id]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'FINALIZE_EPOCH',
                target_type: 'epoch', target_id: String(id),
                before, after: { status: 'FINALIZED' }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Recompute requires super admin and 2-step confirm
    const recomputeTokens = new Map(); // epochId -> { token, expires }

    router.post('/rewards/epochs/:id/recompute', requireSuper, async (req, res) => {
        try {
            const { id } = req.params;
            const { confirm_token } = req.body;
            const epoch = await db.get("SELECT * FROM epochs WHERE id = ?", [id]);
            if (!epoch) return res.status(404).json({ ok: false, error: 'Epoch not found' });

            if (!confirm_token) {
                // Step 1: Generate confirmation token
                const token = crypto.randomBytes(16).toString('hex');
                recomputeTokens.set(String(id), { token, expires: Date.now() + 60000 }); // 60s expiry
                return res.json({
                    ok: true,
                    step: 1,
                    confirm_token: token,
                    message: 'Send this confirm_token back to confirm recompute. Expires in 60s.'
                });
            }

            // Step 2: Verify token
            const stored = recomputeTokens.get(String(id));
            if (!stored || stored.token !== confirm_token || Date.now() > stored.expires) {
                return res.status(400).json({ ok: false, error: 'Invalid or expired confirm token' });
            }

            recomputeTokens.delete(String(id));

            const before = { ...epoch };
            await db.query("UPDATE epochs SET status = 'RECOMPUTING', updated_at = ? WHERE id = ?", [Math.floor(Date.now() / 1000), id]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'RECOMPUTE_EPOCH',
                target_type: 'epoch', target_id: String(id),
                before, after: { status: 'RECOMPUTING' }, ip: req.ip
            });

            res.json({ ok: true, message: 'Epoch recompute initiated' });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/rewards/earnings', async (req, res) => {
        try {
            const { epoch_id } = req.query;
            let sql = "SELECT * FROM epoch_earnings";
            const params = [];

            if (epoch_id) {
                sql += " WHERE epoch_id = ?";
                params.push(epoch_id);
            }

            sql += " ORDER BY epoch_id DESC, amount_usdt DESC LIMIT 200";
            const earnings = await db.query(sql, params);
            res.json({ ok: true, earnings: redactSensitive(earnings) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // SECURITY
    // ═══════════════════════════════════════════════════════

    router.get('/security/alerts', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { severity, status } = req.query;

            let sql = "SELECT * FROM security_alerts WHERE 1=1";
            const params = [];

            if (severity) { sql += " AND severity = ?"; params.push(severity); }
            if (status) { sql += " AND status = ?"; params.push(status); }

            sql += " ORDER BY created_at DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const alerts = await db.query(sql, params);
            res.json({ ok: true, alerts: redactSensitive(alerts), count: alerts.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/security/alerts/:id/triage', requireOps, async (req, res) => {
        try {
            const { id } = req.params;
            const { assigned_to, notes } = req.body;

            const alert = await db.get("SELECT * FROM security_alerts WHERE id = ?", [id]);
            if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

            const before = { status: alert.status, assigned_to: alert.assigned_to };
            await db.query("UPDATE security_alerts SET status = 'triaged', assigned_to = ?, resolution_notes = ? WHERE id = ?",
                [assigned_to || req.user.wallet, notes || '', id]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'TRIAGE_ALERT',
                target_type: 'security_alert', target_id: String(id),
                before, after: { status: 'triaged', assigned_to: assigned_to || req.user.wallet }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/security/alerts/:id/close', requireOps, async (req, res) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;

            const alert = await db.get("SELECT * FROM security_alerts WHERE id = ?", [id]);
            if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

            const before = { status: alert.status };
            await db.query("UPDATE security_alerts SET status = 'closed', resolved_by = ?, resolved_at = ?, resolution_notes = ? WHERE id = ?",
                [req.user.wallet, Date.now(), notes || '', id]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'CLOSE_ALERT',
                target_type: 'security_alert', target_id: String(id),
                before, after: { status: 'closed' }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/security/hold-wallet', requireOps, async (req, res) => {
        try {
            const { wallet, reason } = req.body;
            if (!wallet) return res.status(400).json({ ok: false, error: 'Wallet required' });

            const before = await db.get("SELECT * FROM user_roles WHERE wallet = ?", [wallet]);
            await db.query(`
                INSERT INTO user_roles (wallet, role, updated_at) VALUES (?, 'held', ?)
                ON CONFLICT(wallet) DO UPDATE SET role = 'held', updated_at = excluded.updated_at
            `, [wallet, Date.now()]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'HOLD_WALLET',
                target_type: 'wallet', target_id: wallet,
                before: before || {}, after: { role: 'held', reason }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/security/ban-node', requireOps, async (req, res) => {
        try {
            const { node_id, reason } = req.body;
            if (!node_id) return res.status(400).json({ ok: false, error: 'node_id required' });

            const before = await db.get("SELECT status FROM nodes WHERE node_id = ?", [node_id]);
            await db.query("UPDATE nodes SET status = 'banned' WHERE node_id = ?", [node_id]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'BAN_NODE',
                target_type: 'node', target_id: node_id,
                before: before || {}, after: { status: 'banned', reason }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════

    router.get('/security/audit', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const { actor, action_type, from, to } = req.query;

            let sql = "SELECT * FROM admin_audit_log WHERE 1=1";
            const params = [];

            if (actor) { sql += " AND actor_wallet = ?"; params.push(actor); }
            if (action_type) { sql += " AND action_type = ?"; params.push(action_type); }
            if (from) { sql += " AND created_at > ?"; params.push(parseIntParam(from, 0)); }
            if (to) { sql += " AND created_at < ?"; params.push(parseIntParam(to, Date.now())); }

            sql += " ORDER BY created_at DESC LIMIT ?";
            params.push(Math.min(limit, 500));

            const logs = await db.query(sql, params);
            res.json({ ok: true, logs: redactSensitive(logs), count: logs.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════

    router.get('/settings/feature-flags', async (req, res) => {
        try {
            const flags = await db.query("SELECT * FROM system_flags ORDER BY key");
            res.json({ ok: true, flags });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settings/feature-flags', requireOps, async (req, res) => {
        try {
            const { key, value } = req.body;
            if (!key) return res.status(400).json({ ok: false, error: 'Key required' });

            const before = await db.get("SELECT * FROM system_flags WHERE key = ?", [key]);
            await db.query(`
                INSERT INTO system_flags (key, value, updated_by, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
            `, [key, value, req.user.wallet, Math.floor(Date.now() / 1000)]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'UPDATE_FLAG',
                target_type: 'system_flag', target_id: key,
                before: before || {}, after: { key, value }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/settings/limits', async (req, res) => {
        try {
            const limits = await db.query("SELECT * FROM config_limits ORDER BY key");
            res.json({ ok: true, limits });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settings/limits', requireOps, async (req, res) => {
        try {
            const { key, value } = req.body;
            if (!key) return res.status(400).json({ ok: false, error: 'Key required' });

            const before = await db.get("SELECT * FROM config_limits WHERE key = ?", [key]);
            await db.query(`
                INSERT INTO config_limits (key, value, updated_by, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
            `, [key, value, req.user.wallet, Math.floor(Date.now() / 1000)]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'UPDATE_LIMIT',
                target_type: 'config_limit', target_id: key,
                before: before || {}, after: { key, value }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // CONTROLS
    // ═══════════════════════════════════════════════════════

    router.post('/controls/pause-withdrawals', requireOps, async (req, res) => {
        try {
            const { paused } = req.body;
            const before = await db.get("SELECT value FROM system_flags WHERE key = 'withdrawals_paused'");

            await db.query(`
                INSERT INTO system_flags (key, value, updated_by, updated_at) VALUES ('withdrawals_paused', ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
            `, [paused ? '1' : '0', req.user.wallet, Math.floor(Date.now() / 1000)]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'PAUSE_WITHDRAWALS',
                target_type: 'system', target_id: 'withdrawals_paused',
                before: before || {}, after: { paused: !!paused }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/controls/security-freeze', requireOps, async (req, res) => {
        try {
            const { frozen } = req.body;
            const before = await db.get("SELECT value FROM system_flags WHERE key = 'security_freeze'");

            await db.query(`
                INSERT INTO system_flags (key, value, updated_by, updated_at) VALUES ('security_freeze', ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
            `, [frozen ? '1' : '0', req.user.wallet, Math.floor(Date.now() / 1000)]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'SECURITY_FREEZE',
                target_type: 'system', target_id: 'security_freeze',
                before: before || {}, after: { frozen: !!frozen }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
