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
