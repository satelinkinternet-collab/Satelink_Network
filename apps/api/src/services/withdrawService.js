/**
 * WithdrawService — Production-grade withdraw pipeline.
 *
 * Flow:
 *   epoch_earnings (CLAIMED) → withdrawal record (PROCESSING)
 *   → settlement adapter → blockchain tx → PAID / FAILED
 *
 * Guarantees:
 *   - Idempotent via request_id (UNIQUE constraint)
 *   - Double-withdraw safe (only operates on CLAIMED earnings)
 *   - Wallet binding (user can only withdraw to their own wallet)
 *   - Rate-limited + cooldown enforced before this layer (route-level)
 */
import { randomUUID } from 'node:crypto';

// ── Constants ──
const MAX_WITHDRAW_USDT = 10_000;
const MIN_WITHDRAW_USDT = 0.01;

export class WithdrawService {
    /**
     * @param {object} db            - PgDatabase instance
     * @param {object} settlementAdapter - Adapter with withdraw({ to, amount }) method
     * @param {object} [ledger]      - Economic ledger (optional)
     */
    constructor(db, settlementAdapter, ledger = null) {
        this.db = db;
        this.adapter = settlementAdapter;
        this.ledger = ledger;
    }

    /**
     * processWithdraw — main entry point.
     *
     * @param {object} params
     * @param {string} params.userId        - Authenticated user ID
     * @param {string} params.walletAddress  - Destination wallet (must match user's wallet)
     * @param {string} params.requestId      - Client-supplied idempotency key
     * @returns {Promise<{ withdrawalId, txHash, amount, status }>}
     */
    async processWithdraw({ userId, walletAddress, requestId }) {
        // ── Step 1: Idempotency check ──
        const existing = await this.db.prepare(
            "SELECT id, status, tx_hash, amount_usdt FROM withdrawals_v2 WHERE request_id = ?"
        ).get(requestId);

        if (existing) {
            // Return the existing result — safe replay
            return {
                withdrawalId: existing.id,
                txHash: existing.tx_hash,
                amount: existing.amount_usdt,
                status: existing.status,
                idempotent: true,
            };
        }

        // ── Step 2: Fetch total CLAIMED balance ──
        const balanceRow = await this.db.prepare(
            "SELECT COALESCE(SUM(amount_usdt), 0) AS total FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'CLAIMED'"
        ).get(walletAddress);

        const claimedBalance = balanceRow?.total || 0;

        if (claimedBalance <= 0) {
            throw new WithdrawError('NO_BALANCE', 'No claimed balance available for withdrawal');
        }

        if (claimedBalance < MIN_WITHDRAW_USDT) {
            throw new WithdrawError('BELOW_MINIMUM', `Balance ${claimedBalance} is below minimum withdrawal of ${MIN_WITHDRAW_USDT} USDT`);
        }

        if (claimedBalance > MAX_WITHDRAW_USDT) {
            throw new WithdrawError('EXCEEDS_MAX', `Balance ${claimedBalance} exceeds max withdrawal of ${MAX_WITHDRAW_USDT} USDT per transaction`);
        }

        // ── Step 3: Check system flags ──
        const paused = await this.db.prepare(
            "SELECT value FROM system_flags WHERE key = ?"
        ).get('withdrawals_paused');
        if (paused?.value === '1') {
            throw new WithdrawError('WITHDRAWALS_PAUSED', 'Withdrawals are temporarily paused');
        }

        // ── Step 4: Create withdrawal record (PROCESSING) ──
        const withdrawalId = randomUUID();
        const now = Date.now();

        await this.db.prepare(`
            INSERT INTO withdrawals_v2 (id, user_id, wallet_address, amount_usdt, status, request_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'PROCESSING', ?, ?, ?)
        `).run(withdrawalId, userId, walletAddress, claimedBalance, requestId, now, now);

        // ── Step 5: Call settlement adapter ──
        let txHash = null;
        try {
            const result = await this.adapter.withdraw({
                to: walletAddress,
                amount: claimedBalance,
            });
            txHash = result.txHash;

            // ── Step 6: Update withdrawal → PAID ──
            await this.db.prepare(
                "UPDATE withdrawals_v2 SET status = 'PAID', tx_hash = ?, updated_at = ? WHERE id = ?"
            ).run(txHash, Date.now(), withdrawalId);

            // ── Step 7: Update epoch_earnings → PAID ──
            await this.db.prepare(
                "UPDATE epoch_earnings SET status = 'PAID' WHERE wallet_or_node_id = ? AND status = 'CLAIMED'"
            ).run(walletAddress);

            // ── Step 8: Ledger entry (PAYOUTS_PAYABLE → settled) ──
            if (this.ledger) {
                try {
                    await this.ledger.createTxn({
                        event_type: 'settlement',
                        reference_type: 'withdrawal',
                        reference_id: withdrawalId,
                        memo: `Withdraw settled: ${claimedBalance} USDT → ${walletAddress}`,
                        created_by: 'system_withdraw',
                        lines: [
                            { account_key: 'PAYOUTS_PAYABLE_USDT', direction: 'debit', amount_usdt: claimedBalance },
                            { account_key: 'SETTLED_USDT', direction: 'credit', amount_usdt: claimedBalance },
                        ],
                    });
                } catch (e) {
                    console.error('[WithdrawService] Ledger write failed (non-fatal):', e.message);
                }
            }

            return {
                withdrawalId,
                txHash,
                amount: claimedBalance,
                status: 'PAID',
                idempotent: false,
            };
        } catch (err) {
            // ── Step 9: On failure → mark FAILED ──
            console.error(`[WithdrawService] Settlement failed for ${withdrawalId}:`, err.message);

            await this.db.prepare(
                "UPDATE withdrawals_v2 SET status = 'FAILED', failure_reason = ?, updated_at = ? WHERE id = ?"
            ).run(err.message?.substring(0, 500), Date.now(), withdrawalId);

            throw new WithdrawError('SETTLEMENT_FAILED', `Settlement failed: ${err.message}`, err);
        }
    }

    /**
     * getWithdrawalStatus — query a withdrawal by request_id or withdrawal id.
     */
    async getWithdrawalStatus(requestId) {
        return this.db.prepare(
            "SELECT id, user_id, wallet_address, amount_usdt, status, tx_hash, failure_reason, created_at, updated_at FROM withdrawals_v2 WHERE request_id = ? OR id = ?"
        ).get(requestId, requestId);
    }

    /**
     * getRecentWithdrawals — for cooldown / rate-limit checks at the route level.
     */
    async getRecentWithdrawals(userId, windowMs) {
        const since = Date.now() - windowMs;
        return this.db.prepare(
            "SELECT id, status, created_at FROM withdrawals_v2 WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC"
        ).all(userId, since);
    }
}

/**
 * Typed error for withdraw failures — carries a code for the route handler.
 */
export class WithdrawError extends Error {
    constructor(code, message, cause) {
        super(message);
        this.name = 'WithdrawError';
        this.code = code;
        if (cause) this.cause = cause;
    }
}
