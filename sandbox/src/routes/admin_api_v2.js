import { Router } from 'express';

export function createAdminApiRouter(opsEngine) {
    const router = Router();

    // GET /admin-api/stats - Unified stats for admin dashboard
    router.get('/stats', async (req, res) => {
        try {
            const now = Date.now();
            const todayStart = new Date().setHours(0, 0, 0, 0);

            // Revenue Stats
            const revenueEvents = await opsEngine.db.query("SELECT * FROM revenue_events_v2 ORDER BY created_at DESC LIMIT 100");
            const revenueToday = revenueEvents.filter(e => e.created_at * 1000 >= todayStart).reduce((acc, e) => acc + (e.amount_usdt || 0), 0);

            // Treasury Status
            const treasury = await opsEngine.getTreasuryAvailable();

            // Epoch Status
            const currentEpoch = await opsEngine.db.get("SELECT * FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1");

            // Nodes
            const nodesOnline = (await opsEngine.db.get("SELECT COUNT(*) as c FROM nodes WHERE status = 'online'")).c;
            const nodesOffline = (await opsEngine.db.get("SELECT COUNT(*) as c FROM nodes WHERE status != 'online'")).c;

            res.json({
                ok: true,
                stats: {
                    revenueToday: revenueToday.toFixed(2),
                    treasuryAvailable: treasury.toFixed(2),
                    nodesOnline,
                    nodesOffline,
                    currentEpoch: currentEpoch || { id: 'N/A', status: 'CLOSED' }
                },
                recentEvents: revenueEvents.slice(0, 10)
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
    router.get('/nodes', async (req, res) => {
        try {
            const nodes = await opsEngine.db.query("SELECT * FROM nodes ORDER BY last_seen DESC LIMIT 100");
            res.json({ ok: true, nodes });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    router.get('/nodes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const node = await opsEngine.db.get("SELECT * FROM nodes WHERE node_id = ?", [id]);
            if (!node) return res.status(404).json({ ok: false, error: "Node not found" });

            // Fetch recent heartbeats/events if tables exist, or mock for now
            // We can query revenue_events as a proxy for activity locally
            const recentEvents = await opsEngine.db.query("SELECT * FROM revenue_events_v2 WHERE node_id = ? ORDER BY created_at DESC LIMIT 20", [id]);

            res.json({ ok: true, node, activity: recentEvents });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /admin-api/history - Revenue Trend
    router.get('/history', async (req, res) => {
        try {
            // In prod: SELECT date(created_at), sum(amount) FROM revenue_events GROUP BY date
            // MVP: Mocking a growth curve
            const days = [];
            let base = 1000;
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                base += Math.random() * 200 - 50; // Random walk
                days.push({
                    date: d.toLocaleDateString(),
                    revenue: Math.max(0, base).toFixed(2)
                });
            }
            res.json({ ok: true, history: days });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    // GET /admin-api/nodes/distribution - Node Types Pie Chart
    router.get('/nodes/distribution', async (req, res) => {
        try {
            // Get actual counts if possible, else mock
            const starlink = (await opsEngine.db.get("SELECT COUNT(*) as c FROM nodes WHERE device_type LIKE 'starlink%'"))?.c || 0;
            const iot = (await opsEngine.db.get("SELECT COUNT(*) as c FROM nodes WHERE device_type LIKE 'iot%'"))?.c || 0;
            const validator = (await opsEngine.db.get("SELECT COUNT(*) as c FROM nodes WHERE device_type LIKE 'validator%'"))?.c || 0;

            // If DB empty, show mocks for UI demo
            const distribution = [
                { name: 'Starlink V2', value: starlink || 45 },
                { name: 'Generic IoT', value: iot || 30 },
                { name: 'Validator', value: validator || 15 },
                { name: 'Gateway', value: 10 }
            ];

            res.json({ ok: true, distribution });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    return router;
}
