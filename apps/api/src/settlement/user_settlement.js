import express from 'express';
import { logger } from '../monitoring/logger.js';
import { executeWithdrawal, withdrawRateLimitMiddleware } from './withdraw_service.js';

/**
 * User Settlement Router
 * Handles Node Operator claims and USDT withdrawals.
 * Withdrawals route through canonical withdraw_service.js pipeline.
 */
export function createSettlementRouter(db, opsEngine) {
    const router = express.Router();

    // PART 8: CLAIM EARNINGS
    router.post('/claim', async (req, res) => {
        try {
            const { node_id, wallet } = req.body;
            if (!node_id || !wallet) {
                return res.status(400).json({ ok: false, error: 'Missing node_id or wallet' });
            }

            // Simulate claim verification against Merkle root
            const claimAmount = 100.0; // Mock verified amount
            logger.info(`[Settlement] Node ${node_id} claimed ${claimAmount} USDT`);

            return res.json({
                ok: true,
                claim_id: `claim_${Date.now()}`,
                amount: claimAmount,
                status: 'verified'
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // PART 8: WITHDRAW USDT — routed through canonical withdrawal service
    router.post('/withdraw', withdrawRateLimitMiddleware, async (req, res) => {
        try {
            const { wallet, amount } = req.body;
            if (!wallet || !amount) {
                return res.status(400).json({ ok: false, error: 'Missing wallet or amount' });
            }

            const result = await executeWithdrawal(wallet, amount, opsEngine, {
                sourceRoute: '/v1/settlement/withdraw'
            });

            return res.json({
                ok: true,
                withdrawalId: result.withdrawalId,
                amount,
                destination: wallet,
                status: result.status
            });
        } catch (e) {
            const status = e.statusCode || 500;
            res.status(status).json({ ok: false, error: e.message });
        }
    });

    return router;
}
