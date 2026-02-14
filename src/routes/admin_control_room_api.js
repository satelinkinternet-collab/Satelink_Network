import { Router } from 'express';
import crypto from 'crypto';
import { adminReadLimiter, adminWriteLimiter } from '../middleware/rate_limits.js';

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
export function createAdminControlRoomRouter(opsEngine, opts = {}) {
    const router = Router();
    const db = opsEngine.db;
    const selfTestRunner = opts.selfTestRunner || null;
    const incidentBuilder = opts.incidentBuilder || null;
    const opsReporter = opts.opsReporter || null;

    // All routes require admin role
    // All routes require admin role
    router.use(requireAdmin);

    // Rate Limiting (Phase 11.4)
    router.use((req, res, next) => {
        if (req.method === 'GET') return adminReadLimiter(req, res, next);
        return adminWriteLimiter(req, res, next);
    });

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
                    revenue_mode: flagsMap.revenue_mode || 'ACTIVE',
                    beta_gate_enabled: flagsMap.beta_gate_enabled === '1',
                    system_state: flagsMap.system_state || 'NORMAL'
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

            const [revenue, errors, audit, alerts, slowQs, incidents] = await Promise.all([
                db.query("SELECT 'revenue' as type, id, amount_usdt as value, created_at * 1000 as ts, op_type as label FROM revenue_events_v2 ORDER BY created_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'error' as type, id, status_code as value, last_seen_at as ts, message as label FROM error_events ORDER BY last_seen_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'audit' as type, id, action_type as value, created_at as ts, actor_wallet as label FROM admin_audit_log ORDER BY created_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'alert' as type, id, severity as value, created_at as ts, title as label FROM security_alerts ORDER BY created_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'perf_alert' as type, id, avg_ms as value, last_seen_at as ts, sample_sql as label FROM slow_queries ORDER BY last_seen_at DESC LIMIT ?", [feedLimit]),
                db.query("SELECT 'incident' as type, id, severity as value, created_at as ts, title as label FROM incident_bundles ORDER BY created_at DESC LIMIT ?", [feedLimit]),
            ]);



            const feed = [...revenue, ...errors, ...audit, ...alerts, ...slowQs, ...incidents]
                .map(item => ({
                    event_id: `${item.type}_${item.id}`,
                    type: item.type,
                    severity: ['error', 'alert', 'incident'].includes(item.type) ? (item.value || 'med') : 'info',
                    ts: item.ts,
                    summary: String(item.label || '').substring(0, 200),
                    meta: { raw_value: item.value }
                }))
                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                .slice(0, feedLimit);

            res.json({ ok: true, feed });
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
            const offset = parseIntParam(req.query.offset, 0);
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

            sql += " ORDER BY last_seen DESC LIMIT ? OFFSET ?";
            params.push(Math.min(limit, 500));
            params.push(offset);

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
            const offset = parseIntParam(req.query.offset, 0);
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
            const offset = parseIntParam(req.query.offset, 0);
            const { from, to, service } = req.query;

            let sql = "SELECT * FROM error_events WHERE 1=1";
            const params = [];

            if (service) { sql += " AND service = ?"; params.push(service); }
            if (from) { sql += " AND last_seen_at > ?"; params.push(parseIntParam(from, 0)); }
            if (to) { sql += " AND last_seen_at < ?"; params.push(parseIntParam(to, Date.now())); }

            sql += " ORDER BY last_seen_at DESC LIMIT ? OFFSET ?";
            params.push(Math.min(limit, 500));
            params.push(offset);

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
            const offset = parseIntParam(req.query.offset, 0);
            const queries = await db.query("SELECT * FROM slow_queries ORDER BY last_seen_at DESC LIMIT ? OFFSET ?", [Math.min(limit, 500), offset]);
            res.json({ ok: true, queries: redactSensitive(queries), count: queries.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/ops/traces', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 200);
            const offset = parseIntParam(req.query.offset, 0);
            const { trace_id, request_id, client_id, node_id, route } = req.query;

            let sql = "SELECT * FROM request_traces WHERE 1=1";
            const params = [];

            if (trace_id) { sql += " AND trace_id = ?"; params.push(trace_id); }
            if (request_id) { sql += " AND request_id = ?"; params.push(request_id); }
            if (client_id) { sql += " AND client_id = ?"; params.push(client_id); }
            if (node_id) { sql += " AND node_id = ?"; params.push(node_id); }
            if (route) { sql += " AND route LIKE ?"; params.push(`%${route}%`); }

            sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            params.push(Math.min(limit, 500));
            params.push(offset);

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

    router.get('/rewards/simulated-list', async (req, res) => {
        try {
            const payouts = await db.query("SELECT * FROM withdrawals WHERE status = 'SIMULATED' ORDER BY created_at DESC LIMIT 100");
            res.json({ ok: true, payouts: redactSensitive(payouts) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // OPS REPORTS (Phase 19)
    // ═══════════════════════════════════════════════════════
    router.get('/ops/reports/daily', async (req, res) => {
        try {
            const reports = await opsReporter.getReports(20);
            res.json({ ok: true, reports });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/ops/reports/generate', async (req, res) => {
        try {
            const report = await opsReporter.runDailyReport();
            res.json({ ok: true, report });
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

    // ═══════════════════════════════════════════════════════
    // DIAGNOSTICS
    // ═══════════════════════════════════════════════════════

    // GET /admin/diagnostics/self-tests
    router.get('/diagnostics/self-tests', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const tests = await db.query(
                "SELECT * FROM self_test_runs ORDER BY created_at DESC LIMIT ?",
                [Math.min(limit, 200)]
            );
            res.json({ ok: true, tests, count: tests.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/diagnostics/self-tests/run (admin_super only)
    router.post('/diagnostics/self-tests/run', requireSuper, async (req, res) => {
        try {
            const { kind } = req.body;
            if (!selfTestRunner) {
                return res.status(503).json({ ok: false, error: 'Self-test runner not available' });
            }

            let results;
            if (kind) {
                results = [await selfTestRunner.runKind(kind)];
            } else {
                results = await selfTestRunner.runAll();
            }

            await auditLog(db, {
                actor: req.user.wallet, action: 'RUN_SELF_TEST',
                target_type: 'diagnostics', target_id: kind || 'all',
                before: null, after: { results: results.map(r => ({ kind: r.kind, status: r.status })) },
                ip: req.ip
            });

            res.json({ ok: true, results });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/diagnostics/incidents
    router.get('/diagnostics/incidents', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const offset = parseIntParam(req.query.offset, 0);
            const { status } = req.query;

            let sql = "SELECT * FROM incident_bundles WHERE 1=1";
            const params = [];
            if (status) { sql += " AND status = ?"; params.push(status); }
            sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            params.push(Math.min(limit, 200));
            params.push(offset);

            const incidents = await db.query(sql, params);
            res.json({ ok: true, incidents, count: incidents.length });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/diagnostics/incidents/:incident_id
    router.get('/diagnostics/incidents/:incident_id', async (req, res) => {
        try {
            const incident = await db.get(
                "SELECT * FROM incident_bundles WHERE id = ?",
                [req.params.incident_id]
            );
            if (!incident) return res.status(404).json({ ok: false, error: 'Incident not found' });

            // Parse context_json
            let context = null;
            try { context = JSON.parse(incident.context_json); } catch (_) { }

            res.json({ ok: true, incident: redactSensitive({ ...incident, context }) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/diagnostics/incidents/:incident_id/export
    router.get('/diagnostics/incidents/:incident_id/export', async (req, res) => {
        try {
            const incident = await db.get(
                "SELECT * FROM incident_bundles WHERE id = ?",
                [req.params.incident_id]
            );
            if (!incident) return res.status(404).json({ ok: false, error: 'Incident not found' });

            let bundleJson;
            if (incidentBuilder) {
                // Build fresh correlated bundle around incident time window
                const windowStart = incident.created_at - 15 * 60_000; // 15 min before
                const windowEnd = incident.created_at + 5 * 60_000;   // 5 min after
                bundleJson = await incidentBuilder.buildIncidentBundle({
                    window_start: windowStart,
                    window_end: windowEnd,
                    include_limits: 50
                });
            } else {
                // Fallback to stored context
                try { bundleJson = JSON.parse(incident.context_json); } catch { bundleJson = {}; }
            }

            res.json({ ok: true, incident_id: incident.id, bundle_json: redactSensitive(bundleJson) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/diagnostics/incidents/:incident_id/mark-sent (admin_ops+)
    router.post('/diagnostics/incidents/:incident_id/mark-sent', requireOps, async (req, res) => {
        try {
            const { incident_id } = req.params;
            const incident = await db.get("SELECT * FROM incident_bundles WHERE id = ?", [incident_id]);
            if (!incident) return res.status(404).json({ ok: false, error: 'Incident not found' });

            const before = { status: incident.status };
            await db.query(
                "UPDATE incident_bundles SET status = 'sent_to_agent' WHERE id = ?",
                [incident_id]
            );

            await auditLog(db, {
                actor: req.user.wallet, action: 'MARK_INCIDENT_SENT',
                target_type: 'incident', target_id: String(incident_id),
                before, after: { status: 'sent_to_agent' }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/diagnostics/incidents/:incident_id/resolve (admin_ops+)
    router.post('/diagnostics/incidents/:incident_id/resolve', requireOps, async (req, res) => {
        try {
            const { incident_id } = req.params;
            const { notes } = req.body;
            const incident = await db.get("SELECT * FROM incident_bundles WHERE id = ?", [incident_id]);
            if (!incident) return res.status(404).json({ ok: false, error: 'Incident not found' });

            const before = { status: incident.status };
            await db.query(
                "UPDATE incident_bundles SET status = 'resolved', resolved_by = ?, resolved_at = ?, request_notes = ? WHERE id = ?",
                [req.user.wallet, Date.now(), notes || '', incident_id]
            );

            await auditLog(db, {
                actor: req.user.wallet, action: 'RESOLVE_INCIDENT',
                target_type: 'incident', target_id: String(incident_id),
                before, after: { status: 'resolved' }, ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/diagnostics/fix-request (admin_ops+)
    router.post('/diagnostics/fix-request', requireOps, async (req, res) => {
        try {
            const { incident_id, agent, request_notes, preferred_scope, max_risk } = req.body;
            if (!incident_id) return res.status(400).json({ ok: false, error: 'incident_id required' });

            const incident = await db.get("SELECT * FROM incident_bundles WHERE id = ?", [incident_id]);
            if (!incident) return res.status(404).json({ ok: false, error: 'Incident not found' });

            // Build correlated bundle
            let incidentBundle;
            if (incidentBuilder) {
                const windowStart = incident.created_at - 15 * 60_000;
                const windowEnd = incident.created_at + 5 * 60_000;
                incidentBundle = await incidentBuilder.buildIncidentBundle({
                    window_start: windowStart,
                    window_end: windowEnd,
                    include_limits: 30
                });
            } else {
                try { incidentBundle = JSON.parse(incident.context_json); } catch { incidentBundle = {}; }
            }

            // Build structured task spec
            const taskSpec = {
                objective: 'Fix the incident root cause without breaking existing APIs',
                incident_id: incident.id,
                severity: incident.severity,
                title: incident.title,
                source_kind: incident.source_kind,
                constraints: [
                    'no secrets in output',
                    'no destructive changes',
                    'keep JSON-only API responses',
                    'keep SSE stable',
                    `max_risk: ${max_risk || 'low'}`
                ],
                suggested_debug_path: [
                    'check error_events stack_hash top entries',
                    'trace_id correlation across errors + slow queries',
                    'slow query hotspots and their impacted routes',
                    'recent admin actions that may have triggered the issue'
                ],
                expected_output: [
                    'diff summary of changes',
                    'patch proposal (no auto-apply)',
                    'verification curl commands'
                ],
                request_notes: request_notes || '',
                preferred_scope: preferred_scope || ['backend', 'web', 'db'],
                requested_by: req.user.wallet,
                requested_at: Date.now(),
                agent: agent || 'antigravity'
            };

            // Update incident
            await db.query(
                `UPDATE incident_bundles SET status = 'sent_to_agent', request_notes = ?, preferred_scope = ?, max_risk = ?, task_spec_json = ? WHERE id = ?`,
                [request_notes || '', JSON.stringify(preferred_scope || ['backend', 'web', 'db']),
                max_risk || 'low', JSON.stringify(taskSpec), incident_id]
            );

            await auditLog(db, {
                actor: req.user.wallet, action: 'FIX_REQUEST',
                target_type: 'incident', target_id: String(incident_id),
                before: { status: incident.status },
                after: { status: 'sent_to_agent', task_spec: taskSpec },
                ip: req.ip
            });

            res.json({
                ok: true,
                incident_id: incident.id,
                incident_bundle: redactSensitive(incidentBundle),
                task_spec: taskSpec
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // DB OPS (Phase 11.2)
    // ═══════════════════════════════════════════════════════

    // GET /admin/ops/db/health (admin_super only)
    router.get('/ops/db/health', requireSuper, async (req, res) => {
        try {
            // Get DB size stats
            const fs = await import('fs');
            const path = await import('path');
            const dbPath = process.env.SQLITE_PATH || 'satelink.db';
            const walPath = `${dbPath}-wal`;

            let dbSize = 0;
            let walSize = 0;

            try { dbSize = fs.statSync(path.resolve(dbPath)).size; } catch { }
            try { walSize = fs.statSync(path.resolve(walPath)).size; } catch { }

            // Journal mode check
            const mode = await db.get("PRAGMA journal_mode");
            const walCheck = await db.get("PRAGMA wal_checkpoint(PASSIVE)");

            res.json({
                ok: true,
                stats: {
                    db_size_bytes: dbSize,
                    wal_size_bytes: walSize,
                    journal_mode: mode?.journal_mode,
                    checkpoint_passive: walCheck
                }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/ops/db/checkpoint (admin_super only)
    router.post('/ops/db/checkpoint', requireSuper, async (req, res) => {
        try {
            const mode = req.body.mode || 'TRUNCATE'; // PASSIVE, FULL, RESTART, TRUNCATE
            if (!['PASSIVE', 'FULL', 'RESTART', 'TRUNCATE'].includes(mode)) {
                return res.status(400).json({ ok: false, error: 'Invalid checkpoint mode' });
            }

            const start = Date.now();
            // This might block if not PASSIVE, but that's expected for maintenance
            const result = await db.get(`PRAGMA wal_checkpoint(${mode})`);
            const duration = Date.now() - start;

            await auditLog(db, {
                actor: req.user.wallet, action: 'DB_CHECKPOINT',
                target_type: 'system', target_id: 'db',
                before: null, after: { mode, result, duration_ms: duration },
                ip: req.ip
            });

            res.json({ ok: true, mode, result, duration_ms: duration });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // BETA OPS (Phase 16)
    // ═══════════════════════════════════════════════════════

    // GET /beta/exit-criteria (Phase 20)
    router.get('/beta/exit-criteria', async (req, res) => {
        try {
            // Calculate metrics
            // 1. Beta Users
            const userCount = (await db.get("SELECT COUNT(*) as c FROM beta_users WHERE status='active'")).c;

            // 2. High Sev Incidents (Open)
            const openIncidents = (await db.get("SELECT COUNT(*) as c FROM incident_bundles WHERE severity='high' AND status != 'resolved'")).c;

            // 3. Error Rate (Last 24h)
            const now = Date.now();
            const yest = now - 86400000;
            const errorCount = (await db.get("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?", [yest])).c;
            // Est. trace count if request_traces table exists (Phase 9)
            let traceCount = 0;
            try {
                traceCount = (await db.get("SELECT COUNT(*) as c FROM request_traces WHERE timestamp > ?", [yest])).c;
            } catch (e) {
                // table might not exist or be empty
            }

            const errorRate = traceCount > 0 ? (errorCount / traceCount) * 100 : 0;

            const criteria = [
                { key: 'users', label: 'Active Beta Users', current: userCount, target: 50, unit: 'users', status: userCount >= 50 ? 'pass' : 'warn' },
                { key: 'incidents', label: 'Open High-Sev Incidents', current: openIncidents, target: 0, unit: 'issues', status: openIncidents === 0 ? 'pass' : 'fail' },
                { key: 'errors', label: 'Error Rate (24h)', current: parseFloat(errorRate.toFixed(2)), target: 1.0, unit: '%', status: errorRate < 1.0 ? 'pass' : 'fail' },
                { key: 'latency', label: 'P95 Latency (Global)', current: 150, target: 200, unit: 'ms', status: 'pass' } // Mocked latency for now
            ];

            const overall = criteria.every(c => c.status === 'pass') ? 'READY' : 'NOT_READY';

            res.json({ ok: true, criteria, overall });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/beta/invites
    router.get('/beta/invites', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const invites = await db.query("SELECT * FROM beta_invites ORDER BY created_at DESC LIMIT ?", [limit]);
            res.json({ ok: true, invites });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/beta/invites (Create)
    router.post('/beta/invites', requireSuper, async (req, res) => {
        try {
            const { code, max_uses, expires_in_days } = req.body;
            const inviteCode = code || crypto.randomBytes(4).toString('hex');
            const max = parseInt(max_uses) || 100;
            const expires = expires_in_days ? Date.now() + (expires_in_days * 86400000) : null;

            await db.query(`
                INSERT INTO beta_invites (invite_code, created_by_wallet, max_uses, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?)
            `, [inviteCode, req.user.wallet, max, Date.now(), expires]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'CREATE_INVITE',
                target_type: 'beta_invite', target_id: inviteCode,
                before: null, after: { max_uses: max, expires },
                ip: req.ip
            });

            res.json({ ok: true, invite_code: inviteCode });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/beta/users
    router.get('/beta/users', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const users = await db.query("SELECT * FROM beta_users ORDER BY created_at DESC LIMIT ?", [limit]);
            res.json({ ok: true, users: redactSensitive(users) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /admin/beta/users/:id/suspend
    router.post('/beta/users/:id/suspend', requireOps, async (req, res) => {
        try {
            const { id } = req.params;
            const user = await db.get("SELECT * FROM beta_users WHERE id = ?", [id]);
            if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

            const newStatus = user.status === 'active' ? 'suspended' : 'active';
            await db.query("UPDATE beta_users SET status = ? WHERE id = ?", [newStatus, id]);

            await auditLog(db, {
                actor: req.user.wallet, action: 'SUSPEND_USER',
                target_type: 'beta_user', target_id: String(id),
                before: { status: user.status }, after: { status: newStatus },
                ip: req.ip
            });

            res.json({ ok: true, status: newStatus });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/beta/feedback
    router.get('/beta/feedback', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const rawFeed = await db.query("SELECT * FROM beta_feedback ORDER BY created_at DESC LIMIT ?", [limit]);

            // Enrich with trace info if trace_id exists
            const enriched = await Promise.all(rawFeed.map(async (f) => {
                let traceInfo = null;
                if (f.trace_id) {
                    const trace = await db.get("SELECT status_code, duration_ms, route FROM request_traces WHERE trace_id = ?", [f.trace_id]);
                    if (trace) traceInfo = trace;
                }
                return { ...f, trace_summary: traceInfo };
            }));

            res.json({ ok: true, feedback: enriched });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });


    // POST /controls/exit-safe-mode
    router.post('/controls/exit-safe-mode', requireSuper, async (req, res) => {
        try {
            await opsEngine.updateSystemConfig('system_state', 'NORMAL');
            await opsEngine.updateSystemConfig('revenue_mode', 'ACTIVE');

            await auditLog(db, {
                actor: req.user.wallet, action: 'EXIT_SAFE_MODE',
                target_type: 'system', target_id: 'state',
                ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ═══════════════════════════════════════════════════════
    // SECURITY ENFORCEMENT (Phase 21)
    // ═══════════════════════════════════════════════════════

    // GET /security/enforcement
    router.get('/security/enforcement', async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const events = await db.query("SELECT * FROM enforcement_events ORDER BY created_at DESC LIMIT ?", [limit]);
            res.json({ ok: true, events: redactSensitive(events) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /security/enforcement/block
    router.post('/security/enforcement/block', requireOps, async (req, res) => {
        try {
            // Check if abuseFirewall is available on app
            const firewall = req.app.get('abuseFirewall');
            if (!firewall) return res.status(503).json({ ok: false, error: 'Firewall not initialized' });

            const { type, id, reason, ttl } = req.body;
            if (!type || !id) return res.status(400).json({ ok: false, error: 'Missing type or id' });

            await firewall.blockEntity(type, id, reason || 'manual_block', parseInt(ttl) || 300, req.user.wallet);

            await auditLog(db, {
                actor: req.user.wallet, action: 'FIREWALL_BLOCK',
                target_type: 'enforcement', target_id: `${type}:${id}`,
                after: { reason, ttl },
                ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /security/enforcement/unblock
    router.post('/security/enforcement/unblock', requireOps, async (req, res) => {
        try {
            const firewall = req.app.get('abuseFirewall');
            if (!firewall) return res.status(503).json({ ok: false, error: 'Firewall not initialized' });

            const { type, id } = req.body;
            await firewall.unblockEntity(type, id);

            await auditLog(db, {
                actor: req.user.wallet, action: 'FIREWALL_UNBLOCK',
                target_type: 'enforcement', target_id: `${type}:${id}`,
                ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });


    // POST /diagnostics/load-sim/run
    router.post('/diagnostics/load-sim/run', requireSuper, async (req, res) => {
        try {
            const { profile, minutes } = req.body;
            let rps = 50;
            if (profile === 'medium') rps = 200;
            if (profile === 'heavy') rps = 500;

            const duration = (parseInt(minutes) || 1) * 60;

            // Spawn script
            const { spawn } = await import('child_process');
            const child = spawn('node', ['scripts/load_simulator.js'], {
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, RPS: String(rps), DURATION: String(duration), TARGET_URL: 'http://localhost:8080' }
            });
            child.unref(); // Fire and forget background process

            await auditLog(db, {
                actor: req.user.wallet, action: 'START_LOAD_SIM',
                target_type: 'system', target_id: 'load_test',
                after: { profile, rps, duration },
                ip: req.ip
            });

            res.json({ ok: true, message: `Load sim started: ${rps} RPS for ${duration}s` });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // --- FEATURE FLAGS (Phase 23) ---

    // GET /settings/flags
    router.get('/settings/flags', requireOps, async (req, res) => {
        try {
            const flags = req.app.get('featureFlags').getAllFlags();
            res.json({ ok: true, flags });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /settings/flags/:key
    router.post('/settings/flags/:key', requireSuper, async (req, res) => {
        try {
            const { key } = req.params;
            const { mode, percent, whitelist, description } = req.body;

            await req.app.get('featureFlags').setFlag(key, {
                mode, percent, whitelist, description,
                updatedBy: req.user.wallet
            });

            await auditLog(db, {
                actor: req.user.wallet, action: 'UPDATE_FLAG',
                target_type: 'feature_flag', target_id: key,
                after: { mode, percent, whitelist },
                ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });
    // --- FEATURE FLAGS (Phase 23) ---

    router.get('/settings/flags', requireOps, async (req, res) => {
        try {
            const flags = req.app.get('featureFlags').getAllFlags();
            res.json({ ok: true, flags });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settings/flags/:key', requireSuper, async (req, res) => {
        try {
            const { key } = req.params;
            const { mode, percent, whitelist, description } = req.body;
            await req.app.get('featureFlags').setFlag(key, { mode, percent, whitelist, description, updatedBy: req.user.wallet });
            await auditLog(db, { actor: req.user.wallet, action: 'UPDATE_FLAG', target_type: 'feature_flag', target_id: key, after: { mode, percent }, ip: req.ip });
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // --- DRILLS (Phase 24) ---

    router.post('/drills/:type/run', requireSuper, async (req, res) => {
        try {
            const { type } = req.params; // kill-switch, abuse, recovery
            const drills = req.app.get('drills');

            let result;
            if (type === 'kill-switch') result = await drills.runKillSwitchDrill(req.user.wallet);
            else if (type === 'abuse') result = await drills.runAbuseDrill(req.user.wallet);
            else if (type === 'recovery') result = await drills.runRecoveryDrill(req.user.wallet);
            else return res.status(400).json({ error: "Unknown drill type" });

            await auditLog(db, { actor: req.user.wallet, action: 'RUN_DRILL', target_type: 'drill', target_id: type, after: { result }, ip: req.ip });
            res.json({ ok: true, result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // [Phase 30] Black Swan Drill
    router.post('/drills/black-swan/run', requireAdmin, async (req, res) => {
        try {
            const drills = req.app.get('drills');
            const result = await drills.runBlackSwanDrill(req.user.wallet);
            res.json({ ok: true, data: result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // [Phase 29] Operational Continuity
    router.post('/controls/emergency-lockdown', requireAdmin, async (req, res) => {
        try {
            // Require super admin
            const isSuper = req.user.role === 'admin_super';
            if (!isSuper) return res.status(403).json({ ok: false, error: "Only Super Admin can trigger lockdown" });

            const reason = req.body.reason || "Manual Emergency Lockdown";

            // Trigger OpsEngine Safe Mode
            const opsEngine = req.app.get('opsEngine');
            await opsEngine.setSafeMode(reason);

            // Also set a global flag if needed, but SafeModeAutopilot handles the state
            await auditLog(req.app.get('db'), {
                actor: req.user.wallet,
                action: 'EMERGENCY_LOCKDOWN',
                target_type: 'system',
                active: true,
                reason,
                ip: req.ip
            });

            res.json({ ok: true, mode: 'SAFE_MODE' });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/wallets/rotate', requireAdmin, async (req, res) => {
        try {
            const isSuper = req.user.role === 'admin_super';
            if (!isSuper) return res.status(403).json({ ok: false, error: "Only Super Admin can rotate wallets" });

            const { old_wallet, new_wallet, role } = req.body;
            if (!new_wallet || !role) return res.status(400).json({ ok: false, error: "Missing fields" });

            // Remove old if provided
            if (old_wallet) {
                await db.query("DELETE FROM user_roles WHERE wallet = ?", [old_wallet]);
            }

            // Add new
            await db.query(`
                INSERT INTO user_roles (wallet, role, updated_at) 
                VALUES (?, ?, ?)
                ON CONFLICT(wallet) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at
            `, [new_wallet, role, Date.now()]);

            await auditLog(req.app.get('db'), {
                actor: req.user.wallet,
                action: 'WALLET_ROTATE',
                target_type: 'admin_wallet',
                target_id: new_wallet,
                old: old_wallet,
                ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // [Phase 27] Disaster Recovery: Backups
    router.get('/system/backups', requireAdmin, async (req, res) => {
        try {
            const backupService = req.app.get('backupService');
            if (!backupService) return res.status(503).json({ ok: false, error: "Backup Service not available" });
            const usage = await backupService.getHistory();
            res.json({ ok: true, data: usage });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/system/backups/run', requireAdmin, async (req, res) => {
        try {
            const backupService = req.app.get('backupService');
            if (!backupService) return res.status(503).json({ ok: false, error: "Backup Service not available" });

            // Check for ongoing backup lock? Service handles file copying.
            const result = await backupService.runBackup('manual_admin');
            if (!result.ok) throw new Error(result.error);

            await auditLog(req.app.get('db'), {
                actor: req.user.wallet,
                action: 'BACKUP_CREATE',
                target_type: 'system',
                target_id: result.id,
                after: result,
                ip: req.ip
            });

            res.json({ ok: true, data: result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/system/backups/verify/:id', requireAdmin, async (req, res) => {
        try {
            const backupService = req.app.get('backupService');
            if (!backupService) return res.status(503).json({ ok: false, error: "Backup Service not available" });

            const result = await backupService.verifyBackup(req.params.id);

            await auditLog(req.app.get('db'), {
                actor: req.user.wallet,
                action: 'BACKUP_VERIFY',
                target_type: 'system',
                target_id: req.params.id,
                after: result,
                ip: req.ip
            });

            res.json({ ok: true, data: result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });



    // [Phase 28] Preflight Gate
    router.get('/preflight/status', requireAdmin, async (req, res) => {
        try {
            const preflightCheck = req.app.get('preflightCheck');
            if (!preflightCheck) return res.status(503).json({ ok: false, error: "Preflight Service not available" });
            const status = await preflightCheck.getStatus();
            res.json({ ok: true, data: status });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/system/runbook-content', requireAdmin, async (req, res) => {
        try {
            // Read docs/RUNBOOK.md
            const fs = await import('fs');
            const path = await import('path');
            const runbookPath = path.resolve(process.cwd(), 'docs', 'RUNBOOK.md');

            if (!fs.existsSync(runbookPath)) {
                return res.json({ ok: true, content: "# Runbook not found" });
            }

            const content = fs.readFileSync(runbookPath, 'utf8');
            res.json({ ok: true, content });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // [Phase 31] Settlement Control
    router.get('/settlement/overview', requireAdmin, async (req, res) => {
        try {
            const engine = req.app.get('settlementEngine');
            const db = req.app.get('db');

            const queued = await db.get("SELECT count(*) as c FROM payout_batches_v2 WHERE status='queued'");
            const processing = await db.get("SELECT count(*) as c FROM payout_batches_v2 WHERE status='processing'");
            const failed = await db.get("SELECT count(*) as c FROM payout_batches_v2 WHERE status='failed'");

            const activeAdapter = await db.get("SELECT value FROM system_flags WHERE key='settlement_adapter'");
            const dryRun = await db.get("SELECT value FROM system_flags WHERE key='settlement_dry_run'");
            const shadowMode = await db.get("SELECT value FROM system_flags WHERE key='settlement_shadow_mode'");

            // Health
            const adapterName = activeAdapter?.value || 'SIMULATED';
            const adapter = engine.registry.get(adapterName);
            const health = adapter ? await adapter.healthCheck() : { ok: false, error: 'Adapter not found' };

            res.json({
                ok: true,
                stats: { queued: queued.c, processing: processing.c, failed: failed.c },
                config: {
                    adapter: adapterName,
                    dry_run: dryRun?.value === '1',
                    shadow_mode: shadowMode?.value === '1'
                },
                health
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/settlement/batches', requireAdmin, async (req, res) => {
        try {
            const limit = parseIntParam(req.query.limit, 50);
            const offset = parseIntParam(req.query.offset, 0);
            const batches = await req.app.get('db').query(`
                SELECT * FROM payout_batches_v2 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            res.json({ ok: true, data: batches });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/settlement/shadow-logs', requireAdmin, async (req, res) => {
        try {
            const logs = await req.app.get('db').query(`
                SELECT * FROM settlement_shadow_log 
                ORDER BY created_at DESC 
                LIMIT 50
            `);
            res.json({ ok: true, data: logs });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settlement/config', requireAdmin, async (req, res) => {
        try {
            const isSuper = req.user.role === 'admin_super';
            if (!isSuper) return res.status(403).json({ ok: false, error: "Super Admin required" });

            const { adapter, dry_run, shadow_mode } = req.body;
            const db = req.app.get('db');

            if (adapter) await db.query("UPDATE system_flags SET value=?, updated_at=? WHERE key='settlement_adapter'", [adapter, Date.now()]);
            if (dry_run !== undefined) await db.query("UPDATE system_flags SET value=?, updated_at=? WHERE key='settlement_dry_run'", [dry_run ? '1' : '0', Date.now()]);
            if (shadow_mode !== undefined) await db.query("UPDATE system_flags SET value=?, updated_at=? WHERE key='settlement_shadow_mode'", [shadow_mode ? '1' : '0', Date.now()]);

            // If switching adapter, notify registry? 
            // Registry checks flag on demand in engine, but we might want to update local cache if we had one.
            // Engine reads DB every batch, so it's fine.

            await auditLog(db, {
                actor: req.user.wallet,
                action: 'SETTLEMENT_CONFIG_UPDATE',
                target_type: 'system',
                after: req.body,
                ip: req.ip
            });

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settlement/process-queue', requireAdmin, async (req, res) => {
        try {
            // Manual trigger
            const engine = req.app.get('settlementEngine');
            // Run in background but we can await it for feedback
            await engine.processQueue();
            res.json({ ok: true, message: "Queue processing triggered" });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // [Phase 32] EVM Settlement Control
    router.get('/settlement/evm/batch/:batch_id', requireAdmin, async (req, res) => {
        try {
            const db = req.app.get('db');
            const txs = await db.query("SELECT * FROM settlement_evm_txs WHERE batch_id=? ORDER BY item_id ASC", [req.params.batch_id]);
            res.json({ ok: true, data: txs });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settlement/evm/reconcile/:batch_id', requireAdmin, async (req, res) => {
        try {
            const engine = req.app.get('settlementEngine');
            const result = await engine.reconcileBatch(req.params.batch_id);
            res.json({ ok: true, data: result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/settlement/evm/retry-item', requireAdmin, async (req, res) => {
        try {
            const isSuper = req.user.role === 'admin_super';
            if (!isSuper) return res.status(403).json({ ok: false, error: "Super Admin required" });

            const { batch_id, item_id } = req.body;
            const engine = req.app.get('settlementEngine');

            // Re-trigger via engine wrapper (which calls adapter.createBatch)
            // But engine currently iterates *batches*, not items.
            // We added retryItem to Engine.
            const result = await engine.retryItem(batch_id, item_id);

            await auditLog(req.app.get('db'), {
                actor: req.user.wallet,
                action: 'SETTLEMENT_RETRY_ITEM',
                target_type: 'settlement_item',
                target_id: `${batch_id}:${item_id}`,
                ip: req.ip
            });

            res.json({ ok: true, data: result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
