/**
 * Withdraw Route — POST /api/withdraw
 *
 * Security:
 *   - x-api-key guard (ADMIN_API_KEY)
 *   - JWT auth (user identity + wallet binding)
 *   - Max 10,000 USDT per tx (enforced in WithdrawService)
 *   - Rate limit: 3 withdrawals per hour per user
 *   - Cooldown: 5 minutes between withdrawals
 *   - Wallet binding: user can only withdraw to their own wallet
 */
import { Router } from 'express';
import { ethers } from 'ethers';
import { requireJWT } from '../security/auth_middleware.js';
import { WithdrawError } from '../services/withdrawService.js';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const MAX_WITHDRAWALS_PER_WINDOW = 3;
const COOLDOWN_MS = 5 * 60 * 1000;            // 5 minutes

/**
 * Factory: returns a configured router.
 * @param {WithdrawService} withdrawService
 */
export function createWithdrawRouter(withdrawService) {
    const router = Router();

    // ── Input Validation (runs FIRST, before any auth) ──
    function validateWithdrawBody(req, res, next) {
        console.log('[WITHDRAW] VALIDATION HIT');
        const { to, requestId } = req.body || {};

        if (!to || !requestId) {
            return res.status(400).json({ ok: false, error: "Missing required fields: 'to', 'requestId'" });
        }

        if (!ethers.isAddress(to)) {
            return res.status(400).json({ ok: false, error: 'Invalid wallet address' });
        }

        if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 128) {
            return res.status(400).json({ ok: false, error: 'requestId must be a string between 8-128 characters' });
        }

        next();
    }

    // ── API Key Guard (runs AFTER JWT) ──
    function requireApiKey(req, res, next) {
        console.log('[WITHDRAW] API KEY HIT');
        const key = req.headers['x-api-key'];
        if (!process.env.ADMIN_API_KEY) {
            console.error('[WITHDRAW] ADMIN_API_KEY not set');
            return res.status(500).json({ ok: false, error: 'Server misconfigured' });
        }
        if (!key || key !== process.env.ADMIN_API_KEY) {
            console.warn(`[WITHDRAW] Rejected — invalid API key from ${req.ip}`);
            return res.status(403).json({ ok: false, error: 'Forbidden' });
        }
        next();
    }

    // ── POST /withdraw ──
    // Execution order: 1) validate body (400) → 2) JWT auth (401) → 3) API key (403) → 4) handler
    router.post("/withdraw", validateWithdrawBody, requireJWT, requireApiKey, validateWithdrawBody, requireJWT, requireApiKey, async (req, res) => {
        const { to, amount, requestId } = req.body || {};
        const user = req.user;

        // ── Wallet binding: user can only withdraw to their own wallet ──
        const userWallet = (user.wallet || user.walletAddress || '').toLowerCase();
        if (!userWallet) {
            return res.status(400).json({ ok: false, error: 'No wallet bound to authenticated user' });
        }
        if (to.toLowerCase() !== userWallet) {
            console.warn(`[WITHDRAW] Wallet mismatch: user=${userWallet}, requested=${to}`);
            return res.status(403).json({ ok: false, error: 'Can only withdraw to your own wallet' });
        }

        // ── Rate limit: 3 per hour ──
        try {
            const recent = await withdrawService.getRecentWithdrawals(user.user_id, RATE_LIMIT_WINDOW_MS);
            if (recent.length >= MAX_WITHDRAWALS_PER_WINDOW) {
                return res.status(429).json({ ok: false, error: `Rate limit: max ${MAX_WITHDRAWALS_PER_WINDOW} withdrawals per hour` });
            }

            // ── Cooldown: 5 minutes between withdrawals ──
            if (recent.length > 0) {
                const lastWithdrawal = recent[0]; // ordered DESC
                const elapsed = Date.now() - lastWithdrawal.created_at;
                if (elapsed < COOLDOWN_MS) {
                    const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
                    return res.status(429).json({ ok: false, error: `Cooldown active. Try again in ${waitSec}s` });
                }
            }
        } catch (e) {
            console.error('[WITHDRAW] Rate limit check failed:', e.message);
            // Fail closed — deny the request
            return res.status(500).json({ ok: false, error: 'Rate limit check failed' });
        }

        // ── Process withdrawal ──
        try {
            const result = await withdrawService.processWithdraw({
                userId: user.user_id,
                walletAddress: to,
                requestId,
            });

            const statusCode = result.idempotent ? 200 : 201;
            return res.status(statusCode).json({
                ok: true,
                withdrawalId: result.withdrawalId,
                txHash: result.txHash,
                amount: result.amount,
                status: result.status,
            });
        } catch (err) {
            if (err instanceof WithdrawError) {
                const statusMap = {
                    NO_BALANCE: 400,
                    BELOW_MINIMUM: 400,
                    EXCEEDS_MAX: 400,
                    WITHDRAWALS_PAUSED: 503,
                    SETTLEMENT_FAILED: 502,
                };
                const status = statusMap[err.code] || 500;
                return res.status(status).json({ ok: false, error: err.message, code: err.code });
            }

            console.error('[WITHDRAW] Unexpected error:', err);
            return res.status(500).json({ ok: false, error: 'Internal error' });
        }
    });

    // ── GET /withdraw/status/:requestId ──
    router.get('/withdraw/status/:requestId', requireJWT, requireApiKey, async (req, res) => {
        try {
            const record = await withdrawService.getWithdrawalStatus(req.params.requestId);
            if (!record) {
                return res.status(404).json({ ok: false, error: 'Withdrawal not found' });
            }
            // Only allow the owner to query their own withdrawal
            if (record.user_id !== req.user.user_id) {
                return res.status(403).json({ ok: false, error: 'Forbidden' });
            }
            return res.json({ ok: true, withdrawal: record });
        } catch (e) {
            return res.status(500).json({ ok: false, error: 'Internal error' });
        }
    });

    return router;
}

// ── Default export for backward compatibility during migration ──
// The old route is replaced by the factory above, but we export a stub
// that returns 410 Gone so any old callers get a clear signal.
const legacyRouter = Router();
legacyRouter.post('/withdraw', (_req, res) => {
    res.status(410).json({ ok: false, error: 'Legacy withdraw endpoint removed. Use the production withdraw API.' });
});
export default legacyRouter;
