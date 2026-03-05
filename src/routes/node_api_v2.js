import { Router } from 'express';
import { ethers } from 'ethers';

export function createNodeApiRouter(opsEngine) {
    const router = Router();

    // GET /node/stats - Unified stats for node operator dashboard
    router.get('/stats', async (req, res) => {
        try {
            const wallet = req.user.wallet;

            // Node Status
            const node = await opsEngine.db.get("SELECT * FROM nodes WHERE wallet = ?", [wallet]);

            // Earnings
            const earnings = await opsEngine.db.query("SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? ORDER BY epoch_id DESC LIMIT 20", [wallet]);
            const totalEarned = earnings.reduce((sum, e) => sum + (e.amount_usdt || 0), 0);
            const claimable = earnings.filter(e => e.status === 'UNPAID').reduce((sum, e) => sum + (e.amount_usdt || 0), 0);

            // Withdrawals
            const withdrawals = await opsEngine.db.query("SELECT * FROM withdrawals WHERE wallet = ? ORDER BY created_at DESC LIMIT 10", [wallet]);
            const totalWithdrawn = withdrawals.filter(w => w.status === 'COMPLETED').reduce((sum, w) => sum + (w.amount_usdt || 0), 0);

            // Uptime (Last 5 epochs)
            const uptime = await opsEngine.db.query("SELECT * FROM node_uptime WHERE node_wallet = ? ORDER BY epoch_id DESC LIMIT 5", [wallet]);

            // Logs (Recent Revenue Events)
            const recentEvents = await opsEngine.db.query("SELECT * FROM revenue_events_v2 WHERE node_id = ? ORDER BY created_at DESC LIMIT 50", [node?.node_id]);
            const logs = recentEvents.map(e => ({
                id: e.id,
                timestamp: new Date(e.created_at * 1000).toLocaleTimeString(),
                message: `Processed ${e.op_type} op for ${e.client_id} ($${e.amount_usdt})`,
                type: 'success'
            }));

            res.json({
                ok: true,
                stats: {
                    active: node?.status === 'online',
                    lastHeartbeat: node?.last_seen,
                    totalEarned: totalEarned.toFixed(2),
                    claimable: claimable.toFixed(2),
                    totalWithdrawn: totalWithdrawn.toFixed(2),
                    uptime
                },
                earnings: earnings.slice(0, 5),
                withdrawals,
                logs
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /node-api/status - Real-time node status for the dashboard
    router.get('/status', async (req, res) => {
        try {
            const wallet = req.user.wallet;

            const node = await opsEngine.db.get("SELECT * FROM nodes WHERE wallet = ?", [wallet]);

            const formatUptime = (lastSeen) => {
                if (!lastSeen) return '—';
                const s = Math.floor(Date.now() / 1000) - lastSeen;
                if (s <= 0) return '0d 0h 0m';
                const d = Math.floor(s / 86400);
                const h = Math.floor((s % 86400) / 3600);
                const m = Math.floor((s % 3600) / 60);
                return `${d}d ${h}h ${m}m`;
            };

            const unpaidRows = await opsEngine.db.query(
                "SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID' ORDER BY epoch_id DESC",
                [wallet]
            );
            const claimable = unpaidRows.reduce((sum, e) => sum + (e.amount_usdt || 0), 0);

            // Telemetry: ops per hour over the past 24h → bw proxy
            const dayAgo = Math.floor(Date.now() / 1000) - 86400;
            let telemetry = null;
            if (node?.node_id) {
                const raw = await opsEngine.db.query(
                    `SELECT (created_at / 3600) as hb, COUNT(*) as ops
                     FROM revenue_events_v2
                     WHERE node_id = ? AND created_at > ?
                     GROUP BY hb ORDER BY hb ASC LIMIT 7`,
                    [node.node_id, dayAgo]
                );
                if (raw.length > 0) {
                    telemetry = raw.map(r => ({
                        t: `${String(new Date(r.hb * 3600 * 1000).getUTCHours()).padStart(2, '0')}:00`,
                        cpu: 0,
                        bw: (r.ops || 0) * 10,
                    }));
                }
            }

            // Logs: recent revenue events for this node
            let logs = null;
            if (node?.node_id) {
                const recentLogs = await opsEngine.db.query(
                    "SELECT * FROM revenue_events_v2 WHERE node_id = ? ORDER BY created_at DESC LIMIT 20",
                    [node.node_id]
                );
                if (recentLogs.length > 0) {
                    logs = recentLogs.map(e =>
                        `[${new Date(e.created_at * 1000).toLocaleTimeString()}] [RELAY] ${e.op_type} → $${e.amount_usdt}`
                    );
                }
            }

            res.json({
                ok: true,
                status: {
                    online: node?.status === 'online',
                    uptime: formatUptime(node?.last_seen),
                    earnings: parseFloat(claimable.toFixed(2)),
                    lastPing: node?.last_seen ? node.last_seen * 1000 : Date.now(),
                },
                telemetry,
                logs,
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /node-api/telemetry - Timestamped bandwidth readings for the node telemetry chart
    router.get('/telemetry', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const hours = Math.min(parseInt(req.query.hours) || 24, 168); // default 24h, max 7d
            const since = Math.floor(Date.now() / 1000) - hours * 3600;

            const node = await opsEngine.db.get("SELECT node_id FROM nodes WHERE wallet = ?", [wallet]);

            if (!node?.node_id) {
                return res.json({ ok: true, telemetry: [], hours });
            }

            // Group ops by 1-hour buckets → bandwidth proxy (ops * 10 = MB/s)
            const raw = await opsEngine.db.query(
                `SELECT
                   (created_at / 3600) AS hour_bucket,
                   COUNT(*) AS ops,
                   COALESCE(SUM(amount_usdt), 0) AS revenue
                 FROM revenue_events_v2
                 WHERE node_id = ? AND created_at > ?
                 GROUP BY hour_bucket
                 ORDER BY hour_bucket ASC`,
                [node.node_id, since]
            );

            const telemetry = raw.map(r => ({
                t: `${String(new Date(r.hour_bucket * 3600 * 1000).getUTCHours()).padStart(2, '0')}:00`,
                ts: r.hour_bucket * 3600 * 1000,
                bw: (r.ops || 0) * 10,      // MB/s proxy
                cpu: 0,                       // no CPU table; placeholder
                ops: r.ops || 0,
                revenue: parseFloat((r.revenue || 0).toFixed(4)),
            }));

            res.json({ ok: true, telemetry, hours, node_id: node.node_id });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /node-api/earnings - Paginated earnings history for the authenticated node operator
    router.get('/earnings', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = (page - 1) * limit;

            const earnings = await opsEngine.db.query(
                "SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? ORDER BY epoch_id DESC LIMIT ? OFFSET ?",
                [wallet, limit, offset]
            );
            const countRow = await opsEngine.db.get(
                "SELECT COUNT(*) as total FROM epoch_earnings WHERE wallet_or_node_id = ?",
                [wallet]
            );
            const total = countRow?.total || 0;

            const totalEarned = earnings.reduce((sum, e) => sum + (e.amount_usdt || 0), 0);
            const claimable = earnings.filter(e => e.status === 'UNPAID').reduce((sum, e) => sum + (e.amount_usdt || 0), 0);

            res.json({ ok: true, earnings, page, limit, total, totalEarned: totalEarned.toFixed(2), claimable: claimable.toFixed(2) });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // POST /node/claim
    router.post('/claim', async (req, res) => {
        try {
            const wallet = req.user.wallet;
            const { signature } = req.body;

            if (!signature) {
                return res.status(400).json({ ok: false, error: "Signature required for claiming" });
            }

            const result = await opsEngine.claim(wallet, signature);
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
