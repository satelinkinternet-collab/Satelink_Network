import { Router } from 'express';
import { requireJWT, requireRole, ADMIN_ROLES } from '../../security/auth_middleware.js';
import { getNetworkStats } from '../../monitoring/network_stats.js';

export function createAdminApiRouter(opsEngine) {
    const router = Router();

    // S0-008: Enforce JWT + admin role on all admin API routes
    router.use(requireJWT);
    router.use(requireRole(ADMIN_ROLES));

    // GET /admin-api/stats - Unified stats for admin dashboard
    // SINGLE SOURCE OF TRUTH: delegates to getNetworkStats() (same as /api/network/stats)
    router.get('/stats', async (req, res) => {
        try {
            // Core stats — same function as /api/network/stats
            const networkStats = await getNetworkStats(opsEngine.db);

            // Admin-specific extras (augment, don't duplicate)
            const todayStartSec = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
            const revenueToday = await opsEngine.db.prepare(
                "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE created_at >= ?"
            ).get(todayStartSec);

            let treasury = 0;
            try { treasury = await opsEngine.getTreasuryAvailable(); } catch (_) {}

            const recentEvents = await opsEngine.db.prepare(
                "SELECT * FROM revenue_events_v2 ORDER BY created_at DESC LIMIT 10"
            ).all();

            res.json({
                ok: true,
                stats: {
                    // From unified source
                    totalNodes: networkStats.totalNodes,
                    activeNodes: networkStats.activeNodes,
                    nodesOnline: networkStats.activeNodes,
                    nodesOffline: networkStats.totalNodes - networkStats.activeNodes,
                    currentEpoch: { id: networkStats.currentEpoch, status: networkStats.epochStatus },
                    totalRevenueUsdt: networkStats.totalRevenueUsdt,
                    totalOpsProcessed: networkStats.totalOpsProcessed,
                    lastEpochClosedAt: networkStats.lastEpochClosedAt,
                    settlementMode: networkStats.settlementMode,
                    // Admin-specific extras
                    revenueToday: parseFloat(revenueToday?.total || 0).toFixed(2),
                    treasuryAvailable: treasury.toFixed(2),
                },
                recentEvents,
                _ts: networkStats._ts
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin/treasury - Treasury status
    router.get('/treasury', async (req, res) => {
        const available = await opsEngine.getTreasuryAvailable();
        res.json({ ok: true, available });
    });

    // GET /epochs/current - Current epoch status
    router.get('/epochs/current', async (req, res) => {
        const current = await opsEngine.db.get("SELECT * FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1");
        res.json({ ok: true, epoch: current });
    });

    // GET /admin/revenue-events - Recent revenue events
    router.get('/revenue-events', async (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const events = await opsEngine.db.query("SELECT * FROM revenue_events_v2 ORDER BY created_at DESC LIMIT ?", [limit]);
        res.json({ ok: true, events });
    });

    // POST /admin/controls/pause-withdraw
    router.post('/controls/pause-withdraw', async (req, res) => {
        // RBAC: Super Admin Only
        if (req.user?.role !== 'admin_super') {
            return res.status(403).json({ ok: false, error: "Access Denied: Super Admin restrictions apply." });
        }

        const { paused } = req.body;
        await opsEngine.updateSystemConfig('withdrawals_paused', paused ? '1' : '0');

        // Phase 5: Audit Log
        try {
            await opsEngine.db.query(
                "INSERT INTO audit_logs (actor_wallet, action_type, metadata, created_at) VALUES (?, ?, ?, ?)",
                [req.user?.wallet || 'admin_api', 'PAUSE_WITHDRAWALS', JSON.stringify({ paused }), Date.now()]
            );
        } catch (e) { console.error("Audit Log Error:", e.message); }

        res.json({ ok: true, paused });
    });

    // ─── USER MANAGEMENT (Phase 19) ───
    router.get('/users', async (req, res) => {
        try {
            const term = req.query.search ? `%${req.query.search}%` : '%';

            // Gather unique wallets from roles, nodes, and builders
            const users = await opsEngine.db.query(`
                SELECT DISTINCT u.wallet, 
                       COALESCE(ur.role, 'user') as role,
                       COALESCE(b.created_at, n.updatedAt, 0) as created_at,
                       n.last_heartbeat as last_seen
                FROM (
                    SELECT wallet FROM user_roles
                    UNION SELECT wallet FROM registered_nodes
                    UNION SELECT wallet FROM builders
                ) u
                LEFT JOIN user_roles ur ON u.wallet = ur.wallet
                LEFT JOIN registered_nodes n ON u.wallet = n.wallet
                LEFT JOIN builders b ON u.wallet = b.wallet
                WHERE u.wallet LIKE ?
                ORDER BY created_at DESC
                LIMIT 50
            `, [term]);

            res.json({ ok: true, users });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/users/role', async (req, res) => {
        try {
            const { wallet, role } = req.body;
            if (!wallet || !role) return res.status(400).json({ ok: false, error: "Missing wallet or role" });

            // Enforce Super Admin only
            if (req.user?.role !== 'admin_super') {
                return res.status(403).json({ ok: false, error: "Only Super Admin can change roles" });
            }

            await opsEngine.db.query(`
                INSERT INTO user_roles (wallet, role, updated_at) 
                VALUES (?, ?, ?)
                ON CONFLICT(wallet) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at
            `, [wallet, role, Date.now()]);

            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ─── NODE MONITORING (Phase 19) ───
    // Uses registered_nodes (single source of truth for node data)
    router.get('/nodes', async (req, res) => {
        try {
            const nodes = await opsEngine.db.prepare(
                "SELECT wallet, node_type, active, last_heartbeat, is_flagged, latency, bandwidth FROM registered_nodes ORDER BY last_heartbeat DESC NULLS LAST LIMIT 100"
            ).all();
            // Map to consistent format expected by frontend
            const mapped = nodes.map(n => ({
                node_id: n.wallet,
                wallet: n.wallet,
                device_type: n.node_type,
                status: n.active ? 'online' : 'offline',
                last_seen: n.last_heartbeat,
                is_flagged: n.is_flagged,
                latency: n.latency,
                bandwidth: n.bandwidth
            }));
            res.json({ ok: true, nodes: mapped });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/services/nodes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const node = await opsEngine.db.prepare(
                "SELECT wallet, node_type, active, last_heartbeat, is_flagged, latency, bandwidth FROM registered_nodes WHERE wallet = ?"
            ).get(id);
            if (!node) return res.status(404).json({ ok: false, error: "Node not found" });

            const mapped = {
                node_id: node.wallet,
                wallet: node.wallet,
                device_type: node.node_type,
                status: node.active ? 'online' : 'offline',
                last_seen: node.last_heartbeat,
                is_flagged: node.is_flagged
            };

            const recentEvents = await opsEngine.db.prepare(
                "SELECT * FROM revenue_events_v2 WHERE node_id = ? ORDER BY created_at DESC LIMIT 20"
            ).all(id);

            res.json({ ok: true, node: mapped, activity: recentEvents });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin-api/history - Revenue Trend (real data from epochs)
    router.get('/history', async (req, res) => {
        try {
            // Real revenue trend from finalized epochs
            const epochs = await opsEngine.db.prepare(`
                SELECT id, total_revenue_usdt, ends_at
                FROM epochs
                WHERE status = 'FINALIZED' AND total_revenue_usdt > 0
                ORDER BY ends_at DESC
                LIMIT 30
            `).all();

            const history = epochs.reverse().map(e => ({
                epoch: e.id,
                date: e.ends_at ? new Date(e.ends_at * 1000).toLocaleDateString() : 'N/A',
                revenue: parseFloat(e.total_revenue_usdt || 0).toFixed(4)
            }));

            res.json({ ok: true, history });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // GET /admin-api/nodes/distribution - Node Types Pie Chart
    // Uses registered_nodes (single source of truth)
    router.get('/services/nodes/distribution', async (req, res) => {
        try {
            const distribution = await opsEngine.db.prepare(`
                SELECT node_type as name, COUNT(*) as value
                FROM registered_nodes
                GROUP BY node_type
                ORDER BY value DESC
            `).all();

            // If no nodes yet, return empty array (no fake data)
            res.json({ ok: true, distribution: distribution.length > 0 ? distribution : [] });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // ─── FLEET READINESS (powers /admin/network/fleet page) ───
    router.get('/network/fleet/summary', async (req, res) => {
        try {
            const db = opsEngine.db;
            const nowSec = Math.floor(Date.now() / 1000);

            const active5m = await db.prepare(
                "SELECT COUNT(*) as count FROM registered_nodes WHERE last_heartbeat >= ?"
            ).get(nowSec - 300);
            const active1h = await db.prepare(
                "SELECT COUNT(*) as count FROM registered_nodes WHERE last_heartbeat >= ?"
            ).get(nowSec - 3600);
            const active24h = await db.prepare(
                "SELECT COUNT(*) as count FROM registered_nodes WHERE last_heartbeat >= ?"
            ).get(nowSec - 86400);

            res.json({
                ok: true,
                active_5m: active5m?.count || 0,
                active_1h: active1h?.count || 0,
                active_24h: active24h?.count || 0
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/network/fleet/flaky', async (req, res) => {
        try {
            const db = opsEngine.db;
            const nowSec = Math.floor(Date.now() / 1000);
            const tenMinAgo = nowSec - 600;

            // Flaky = nodes with heartbeat in last 10m but not consistently active
            const flaky = await db.prepare(`
                SELECT wallet as node_id, last_heartbeat as last_seen, active,
                       CASE WHEN active = 1 AND last_heartbeat < ? THEN 1 ELSE 0 END as is_flaky
                FROM registered_nodes
                WHERE last_heartbeat >= ? AND last_heartbeat < ?
                ORDER BY last_heartbeat ASC
                LIMIT 50
            `).all(nowSec - 120, tenMinAgo, nowSec - 60);

            res.json({
                ok: true,
                data: flaky.map(n => ({
                    node_id: n.node_id,
                    hb_count: 1,
                    last_seen: n.last_seen ? new Date(n.last_seen * 1000).toISOString() : null
                }))
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.post('/network/quarantine', async (req, res) => {
        try {
            const { node_id, duration_m } = req.body;
            if (!node_id) return res.status(400).json({ ok: false, error: "node_id required" });

            await opsEngine.db.prepare(
                "UPDATE registered_nodes SET active = 0, is_flagged = 1 WHERE wallet = ?"
            ).run(node_id);

            res.json({ ok: true, message: `Node ${node_id} quarantined for ${duration_m || 60}m` });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin-api/withdrawals — powers simulated withdrawals page
    router.get('/withdrawals', async (req, res) => {
        try {
            const withdrawals = await opsEngine.db.prepare(
                "SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 50"
            ).all();
            res.json({ ok: true, data: withdrawals });
        } catch (e) {
            // Table may not exist yet
            res.json({ ok: true, data: [] });
        }
    });

    // GET /admin-api/preflight/status — powers launch checklist page
    router.get('/preflight/status', async (req, res) => {
        try {
            const checks = {
                database: true,
                nodes_registered: false,
                epoch_running: false,
                revenue_flowing: false
            };
            const nodeCount = await opsEngine.db.prepare("SELECT COUNT(*) as c FROM registered_nodes").get();
            checks.nodes_registered = (nodeCount?.c || 0) > 0;
            const openEpoch = await opsEngine.db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' LIMIT 1").get();
            checks.epoch_running = !!openEpoch;
            const revCount = await opsEngine.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2").get();
            checks.revenue_flowing = (revCount?.c || 0) > 0;

            res.json({ ok: true, checks, ready: Object.values(checks).every(Boolean) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin-api/growth/referrals — powers referrals page
    router.get('/growth/referrals', async (req, res) => {
        try {
            const referrals = await opsEngine.db.prepare(`
                SELECT distributor_wallet, COUNT(*) as count,
                       COALESCE(SUM(commission_usdt), 0) as total_commission
                FROM distributor_commissions
                GROUP BY distributor_wallet
                ORDER BY count DESC LIMIT 50
            `).all();
            res.json({ ok: true, data: referrals });
        } catch (e) {
            // Table may not exist
            res.json({ ok: true, data: [] });
        }
    });

    return router;
}
