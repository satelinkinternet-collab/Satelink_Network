import { Router } from 'express';
import { sseHelper } from '../utils/sse.js';

export function createStreamApiRouter(opsEngine) {
    const router = Router();

    /**
     * SHARED: Stream polling logic
     */
    const pollDB = async (query, params) => {
        try {
            return await opsEngine.db.query(query, params); // usage assumes array return
        } catch (e) {
            console.error("[SSE] Poll Error:", e.message);
            return [];
        }
    };

    const getSystemConfig = async () => {
        try {
            const rows = await opsEngine.db.query("SELECT * FROM system_config");
            return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
        } catch (e) { return {}; }
    };

    /**
     * GET /stream/admin
     * Access: Admin only (guarded by verifyJWT + role check in handler or middleware)
     */
    router.get('/admin', async (req, res) => {
        if (!['admin_super', 'admin_ops'].includes(req.user?.role)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const conn = sseHelper.init(req, res);
        let lastEventId = 0;

        // Pollers
        const pollTreasury = setInterval(async () => {
            try {
                const treasury = await opsEngine.getTreasuryAvailable();
                const activeNodes = (await opsEngine.db.get("SELECT COUNT(*) as c FROM registered_nodes WHERE active = 1"))?.c || 0;

                conn.send('snapshot', {
                    balance: treasury,
                    active_nodes: activeNodes,
                    timestamp: Date.now()
                });
            } catch (e) { }
        }, 10000);

        const pollRevenue = setInterval(async () => {
            try {
                // Fetch events newer than lastEventId
                // NOTE: id > lastEventId. On first run lastEventId=0, might fetch too many.
                // Limit to last 5 on first run, then incremental.
                const events = await pollDB(
                    `SELECT * FROM revenue_events_v2 WHERE id > ? ORDER BY id ASC LIMIT 10`,
                    [lastEventId]
                );

                if (events.length > 0) {
                    lastEventId = events[events.length - 1].id;
                    conn.send('revenue_batch', events);
                }
            } catch (e) { }
        }, 10000);

        const pollControls = setInterval(async () => {
            try {
                const config = await getSystemConfig();
                conn.send('control_state', config);
            } catch (e) { }
        }, 10000);

        // Cleanup specific to this route
        req.on('close', () => {
            clearInterval(pollTreasury);
            clearInterval(pollRevenue);
            clearInterval(pollControls);
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
        const conn = sseHelper.init(req, res);

        const pollStatus = setInterval(async () => {
            try {
                const node = await opsEngine.db.get("SELECT * FROM registered_nodes WHERE wallet = ?", [wallet]);
                if (node) {
                    const now = Math.floor(Date.now() / 1000);
                    const isOnline = (now - node.last_heartbeat) < 300; // 5 mins tolerance
                    conn.send('node_status', {
                        online: isOnline,
                        last_seen: node.last_heartbeat,
                        ip: '127.0.0.1' // Mock, actual would be in DB if tracked
                    });
                }
            } catch (e) { }
        }, 10000);

        const pollEarnings = setInterval(async () => {
            try {
                // Total earnings
                const total = await opsEngine.getBalance(wallet);
                // Last 5 epochs
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

        const wallet = req.user.wallet; // Builder Identity key
        const conn = sseHelper.init(req, res);

        let lastUsageId = 0;

        const pollUsage = setInterval(async () => {
            try {
                // Get usage stats - this is heavy if aggregated.
                // Better: Stream recent request logs or just current meter.
                // MVP: Stream recent requests from revenue_events where client_id = wallet

                const events = await pollDB(
                    `SELECT * FROM revenue_events_v2 WHERE client_id = ? AND id > ? ORDER BY id ASC LIMIT 5`,
                    [wallet, lastUsageId]
                );

                if (events.length > 0) {
                    lastUsageId = events[events.length - 1].id;
                    conn.send('usage_log', events);
                }

                // Balance / Credit if we had prepaid
                // const balance = ... 
            } catch (e) { }
        }, 10000);

        req.on('close', () => {
            clearInterval(pollUsage);
        });
    });

    return router;
}
