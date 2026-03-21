import express from 'express';
import crypto from 'crypto';
import { requireJWT, requireRole } from '../../security/auth_middleware.js';

export function createWithdrawalRouter(db) {
    const router = express.Router();

    /**
     * POST /api/withdraw
     * C-03: Protected by JWT + node_operator role + wallet ownership check
     * Accepts: { wallet, amount_usdt }
     */
    router.post('/withdraw', requireJWT, requireRole(['node_operator', 'admin_super']), async (req, res) => {
        console.log('[WITHDRAW] request_received');

        const { wallet, amount_usdt } = req.body;

        // Validation
        if (!wallet || typeof amount_usdt !== 'number' || amount_usdt <= 0) {
            console.error('[WITHDRAW] validation_failed: invalid input');
            return res.status(400).json({ ok: false, error: 'Invalid input' });
        }

        // C-03: Ownership check — user can only withdraw to their own wallet (admins exempt)
        if (req.user.role !== 'admin_super' && req.user.wallet?.toLowerCase() !== wallet.toLowerCase()) {
            console.error('[WITHDRAW] ownership_failed: wallet mismatch');
            return res.status(403).json({ ok: false, error: 'Cannot withdraw to a wallet you do not own' });
        }
        console.log('[WITHDRAW] validation_passed');

        const id = crypto.randomUUID();

        try {
            // 1. Insert the record
            await db.prepare(`
                INSERT INTO withdrawals (id, wallet, amount_usdt, status, retry_count, created_at)
                VALUES ($1, $2, $3, 'PENDING', 0, $4)
            `).run([id, wallet, amount_usdt, Date.now()]);

            // 2. Immediate verification (Phase 1 Audit requirement)
            const record = await db.prepare("SELECT * FROM withdrawals WHERE id = ?").get([id]);
            
            if (!record) {
                console.error('[WITHDRAW] verification_failed: record missing after insert');
                throw new Error('Database write verification failed');
            }

            // 3. Status Reality Check
            const validStates = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
            if (!validStates.includes(record.status)) {
                console.error('[WITHDRAW] verification_failed: fake success / invalid status detected:', record.status);
                throw new Error('Invalid withdrawal state detected');
            }

            console.log('[WITHDRAW] settlement_started');
            console.log('[DB] Verified withdrawal record:', id);
            
            res.json({ ok: true, id, status: record.status });

        } catch (error) {
            console.error(`[WITHDRAW] execution_failed:`, error.message);
            return res.status(500).json({ ok: false, error: 'Failed to process withdrawal pipeline' });
        }
    });

    return router;
}
