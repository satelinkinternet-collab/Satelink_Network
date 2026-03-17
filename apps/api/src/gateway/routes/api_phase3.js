import { Router } from 'express';
import { RevenueOracle } from '../../economics/revenue_oracle.js';
import { TreasuryMonitor } from '../../monitoring/treasury_monitor.js';
import fuseService from '../../security/fuse.js';
import { requireJWT, requireRole } from '../../security/auth_middleware.js';
import { executeWithdrawal, withdrawRateLimitMiddleware } from '../../settlement/withdraw_service.js';

export function createPhase3Router(db, opsEngine) {
    const router = Router();
    const oracle = new RevenueOracle(fuseService, db);
    const treasury = new TreasuryMonitor(fuseService, db);

    // GET /api/treasury/status
    router.get('/treasury/status', async (req, res) => {
        try {
            // Ideally we capture snapshot periodically, but for MVP we can proxy it or fetch latest
            const latest = treasury.getLatestSnapshot();
            if (latest) {
                res.json({ ok: true, data: latest });
            } else {
                // Generate on the fly if no snapshot exists
                const snapshot = await treasury.captureSnapshot();
                res.json({ ok: true, data: snapshot });
            }
        } catch (error) {
            res.status(500).json({ ok: false, error: 'Failed to fetch treasury status' });
        }
    });

    // GET /api/settlement/mode
    router.get('/services/settlement/mode', (req, res) => {
        // Look at FEATURE_REAL_SETTLEMENT or similar. If we are running EVM we return EVM.
        // For phase 3 we are doing EVM
        res.json({
            ok: true,
            data: {
                mode: process.env.FEATURE_REAL_SETTLEMENT === 'true' ? 'EVM' : 'SIMULATED',
                chainName: 'Fuse (Testnet)',
                contractAddress: process.env.REVENUE_VAULT_CONTRACT || '0x...'
            }
        });
    });

    // We assume authentication middleware runs before this or we check req.user
    const requireAuth = [requireJWT, requireRole('node_operator')];

    // POST /api/node/me/claim
    router.post('/node/me/claim', requireAuth, async (req, res) => {
        try {
            const { epochId } = req.body;
            const wallet = req.user.wallet;

            if (epochId === undefined) {
                return res.status(400).json({ ok: false, error: 'epochId is required' });
            }

            const claimData = oracle.getClaimData(epochId, wallet);

            if (!claimData) {
                return res.status(404).json({ ok: false, error: 'No claim entitlement found for this epoch' });
            }

            res.json({
                ok: true,
                claim: {
                    epochId,
                    amount: claimData.amount_usdt,
                    proof: claimData.proof
                }
            });
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // POST /api/node/me/withdraw - Routes through canonical withdrawal service
    // On-chain execution recorded alongside canonical withdrawal pipeline
    router.post('/node/me/withdraw', requireAuth, withdrawRateLimitMiddleware, async (req, res) => {
        try {
            const { claimId, amount, txHash } = req.body;
            const wallet = req.user.wallet;

            // Route through canonical withdrawal service if opsEngine available
            if (opsEngine) {
                const result = await executeWithdrawal(wallet, amount, opsEngine, {
                    sourceRoute: '/node/me/withdraw'
                });

                // Also record on-chain tx hash in claim_withdrawals for audit trail
                try {
                    db.prepare(`
                        INSERT INTO claim_withdrawals (operator_wallet, amount_usdt, tx_hash, withdrawn_at)
                        VALUES (?, ?, ?, ?)
                    `).run(wallet, amount, txHash, Date.now());
                } catch (_) { /* claim_withdrawals table may not exist yet */ }

                return res.json({
                    ok: true,
                    withdrawalId: result.withdrawalId,
                    status: result.status,
                    hash: txHash
                });
            }

            // Fallback: record only (no opsEngine provided)
            db.prepare(`
                INSERT INTO claim_withdrawals (operator_wallet, amount_usdt, tx_hash, withdrawn_at)
                VALUES (?, ?, ?, ?)
            `).run(wallet, amount, txHash, Date.now());

            res.json({
                ok: true,
                status: 'RECORDED',
                hash: txHash
            });
        } catch (error) {
            const status = error.statusCode || 500;
            res.status(status).json({ ok: false, error: error.message });
        }
    });

    return router;
}
