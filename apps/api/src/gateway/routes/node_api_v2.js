import { Router } from 'express';
import { ethers } from 'ethers';
import { requireJWT, requireRole } from '../../security/auth_middleware.js';

export function createNodeApiRouter(opsEngine) {
    const router = Router();

    // S0-008: Enforce JWT + node_operator role on all routes
    router.use(requireJWT);
    router.use(requireRole(['node_operator']));

    // GET /node/stats - Unified stats for node operator dashboard
    // Uses registered_nodes (single source of truth) instead of empty 'nodes' table
    router.get('/stats', async (req, res) => {
        try {
            const wallet = req.user.wallet;

            // Node Status — from registered_nodes (the actual populated table)
            const node = await opsEngine.db.prepare(
                "SELECT wallet, node_type, active, last_heartbeat, is_flagged FROM registered_nodes WHERE wallet = ?"
            ).get(wallet);

            // Earnings — node_id in revenue_events_v2 maps to wallet in registered_nodes
            const earnings = await opsEngine.db.prepare(
                "SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? ORDER BY epoch_id DESC LIMIT 20"
            ).all(wallet);
            const totalEarned = earnings.reduce((sum, e) => sum + (e.amount_usdt || 0), 0);
            const claimable = earnings.filter(e => e.status === 'UNPAID').reduce((sum, e) => sum + (e.amount_usdt || 0), 0);

            // Withdrawals
            let withdrawals = [];
            let totalWithdrawn = 0;
            try {
                withdrawals = await opsEngine.db.prepare(
                    "SELECT * FROM withdrawals WHERE wallet = ? ORDER BY created_at DESC LIMIT 10"
                ).all(wallet);
                totalWithdrawn = withdrawals.filter(w => w.status === 'COMPLETED').reduce((sum, w) => sum + (w.amount_usdt || 0), 0);
            } catch (_) { /* withdrawals table may not exist yet */ }

            // Uptime (Last 5 epochs)
            let uptime = [];
            try {
                uptime = await opsEngine.db.prepare(
                    "SELECT * FROM node_uptime WHERE node_wallet = ? ORDER BY epoch_id DESC LIMIT 5"
                ).all(wallet);
            } catch (_) { /* node_uptime table may not exist yet */ }

            // Logs (Recent Revenue Events) — node_id = wallet for registered_nodes
            const recentEvents = await opsEngine.db.prepare(
                "SELECT * FROM revenue_events_v2 WHERE node_id = ? ORDER BY created_at DESC LIMIT 50"
            ).all(wallet);
            const logs = recentEvents.map(e => ({
                id: e.id,
                timestamp: new Date(e.created_at * 1000).toLocaleTimeString(),
                message: `Processed ${e.op_type} op for ${e.client_id} ($${e.amount_usdt})`,
                type: 'success'
            }));

            // Also include network-level stats for context (same source as /api/network/stats)
            const { getNetworkStats } = await import('../../monitoring/network_stats.js');
            const networkStats = await getNetworkStats(opsEngine.db);

            res.json({
                ok: true,
                stats: {
                    active: node?.active === 1 || node?.active === true,
                    lastHeartbeat: node?.last_heartbeat,
                    totalEarned: totalEarned.toFixed(2),
                    claimable: claimable.toFixed(2),
                    totalWithdrawn: totalWithdrawn.toFixed(2),
                    uptime
                },
                network: {
                    totalNodes: networkStats.totalNodes,
                    activeNodes: networkStats.activeNodes,
                    currentEpoch: networkStats.currentEpoch,
                    totalRevenueUsdt: networkStats.totalRevenueUsdt,
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
