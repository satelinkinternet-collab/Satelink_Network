import crypto from 'crypto';

export class NodeopsWaterfallService {
    constructor(db) {
        this.db = db;
    }

    async init() {
        // Automatically run migrations if needed for testing scope
        if (typeof this.db.exec === 'function') {
            try {
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS operator_billing (
                        operator_id TEXT PRIMARY KEY,
                        nodeops_monthly_cost_usdt REAL NOT NULL DEFAULT 0,
                        prepaid_until INTEGER, 
                        reserve_start_date INTEGER, 
                        reserve_months_total INTEGER DEFAULT 6,
                        reserve_rate REAL DEFAULT 0.10,
                        reserve_balance_usdt REAL DEFAULT 0,
                        reserve_target_usdt REAL,
                        arrears_usdt REAL DEFAULT 0,
                        created_at INTEGER,
                        updated_at INTEGER
                    );
                    CREATE TABLE IF NOT EXISTS ledger_entries (
                        id TEXT PRIMARY KEY,
                        operator_id TEXT NOT NULL,
                        period_start INTEGER,
                        period_end INTEGER,
                        type TEXT NOT NULL,
                        amount_usdt REAL NOT NULL,
                        direction TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        reference_id TEXT,
                        created_at INTEGER,
                        updated_at INTEGER
                    );
                `);
            } catch (e) {
                // Ignore if tables exist
            }
        }
    }

    /**
     * Executes the Economics Waterfall Math for a given billing period
     * 
     * @param {string} operatorId 
     * @param {object} period { start: timestamp, end: timestamp }
     * @param {number} grossRewardUsdt 
     * @returns {object} settlement summary
     */
    async settleOperatorPeriod(operatorId, period, grossRewardUsdt) {
        let billing = this.db.prepare("SELECT * FROM operator_billing WHERE operator_id = ?").get([operatorId]);
        if (!billing) {
            throw new Error(`Billing record not found for operator ${operatorId}`);
        }

        const now = Math.floor(Date.now() / 1000);
        const R = Number(grossRewardUsdt || 0);
        const entries = [];

        // Note: 'in' = increases payable balance to operator, 'out' = decreases it

        // 1. Log gross reward
        if (R > 0) {
            entries.push(this._makeEntry(operatorId, period, 'REWARD_IN', R, 'in', 'posted'));
        }

        // 2. NodeOps Due Calculation
        let D = 0;
        let isPrepaid = billing.prepaid_until && billing.prepaid_until > period.end;
        if (!isPrepaid) {
            D = Number(billing.nodeops_monthly_cost_usdt) + Number(billing.arrears_usdt);
        }

        if (D > 0) {
            entries.push(this._makeEntry(operatorId, period, 'NODEOPS_DUE', D, 'out', 'posted'));
        }

        // 3. NodeOps Payment (Waterfall Step 1)
        const pay_nodeops = Math.min(R, D);
        let updatedArrears = Number(billing.arrears_usdt);

        if (pay_nodeops > 0) {
            entries.push(this._makeEntry(operatorId, period, 'NODEOPS_PAYMENT', pay_nodeops, 'out', 'pending'));
            updatedArrears = D - pay_nodeops; // Math resolves arrears + current month correctly
        } else if (D > 0) {
            updatedArrears = D;
        }

        // 4. Reserve Allocation (Waterfall Step 2)
        let remaining = R - pay_nodeops;
        let alloc_reserve = 0;
        let updatedReserveBalance = Number(billing.reserve_balance_usdt);

        // Check if within reserve window
        const reserveMonthsMs = (billing.reserve_months_total || 6) * 30 * 24 * 60 * 60;
        const reserveEnd = (billing.reserve_start_date || 0) + reserveMonthsMs;
        const withinReserveWindow = billing.reserve_start_date && (period.end <= reserveEnd);

        if (withinReserveWindow && remaining > 0) {
            const ruleAmount = R * Number(billing.reserve_rate || 0.10);

            let targetCappedAmount = ruleAmount;
            if (billing.reserve_target_usdt !== null && billing.reserve_target_usdt !== undefined) {
                const target = Number(billing.reserve_target_usdt);
                const remainingToTarget = Math.max(0, target - updatedReserveBalance);
                targetCappedAmount = Math.min(ruleAmount, remainingToTarget);
            }

            const desiredAlloc = Math.max(0, targetCappedAmount);
            alloc_reserve = Math.min(remaining, desiredAlloc);

            if (alloc_reserve > 0) {
                // Post reserve ONLY if nodeops payment resolves/posts. For now, we pend or post based on nodeops success.
                // Since this system doesn't immediately wait for external execution, we'll mark as pending
                // and tie it to the NODEOPS_PAYMENT success in execution.
                entries.push(this._makeEntry(operatorId, period, 'RESERVE_ALLOCATION', alloc_reserve, 'out', 'pending'));
                updatedReserveBalance += alloc_reserve;
                remaining -= alloc_reserve;
            }
        }

        // 5. Operator Payout (Waterfall Step 3)
        const operator_payout = Math.max(0, remaining);
        if (operator_payout > 0) {
            entries.push(this._makeEntry(operatorId, period, 'OPERATOR_PAYOUT', operator_payout, 'out', 'pending'));
        }

        // 6. Transactional Write
        try {
            await this.db.transaction(async (tx) => {
                // Update Billing State
                tx.prepare(`
                    UPDATE operator_billing 
                    SET arrears_usdt = ?, reserve_balance_usdt = ?, updated_at = ?
                    WHERE operator_id = ?
                `).run([updatedArrears, updatedReserveBalance, now, operatorId]);

                // Insert ledger entries
                for (const entry of entries) {
                    tx.prepare(`
                        INSERT INTO ledger_entries (id, operator_id, period_start, period_end, type, amount_usdt, direction, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run([entry.id, entry.operator_id, entry.period_start, entry.period_end, entry.type, entry.amount_usdt, entry.direction, entry.status, entry.created_at, entry.updated_at]);
                }
            });
        } catch (e) {
            console.error("Settlement write failed:", e.message);
            throw e;
        }

        return {
            operatorId,
            period,
            summary: {
                gross_reward: R,
                due_amount: D,
                pay_nodeops,
                alloc_reserve,
                operator_payout,
                arrears_carried: updatedArrears,
            },
            entries
        };
    }

    /**
     * Placeholder execution router.
     * Transitions 'pending' payments (NodeOps & Operator) to 'posted' status.
     * In reality, this would submit to an EvmAdapter or Stripe webhook.
     */
    async executePayments(periodStart, periodEnd, simulateFailure = false) {
        const execNow = Math.floor(Date.now() / 1000);
        let postedNodeOps = 0;
        let postedReserve = 0;
        let postedPayouts = 0;

        if (simulateFailure) {
            return {
                executed: 0,
                status: 'simulated_failure',
                details: { posted_nodeops: 0, posted_reserve: 0, posted_payouts: 0, total_posted: 0 }
            };
        }

        await this.db.transaction(async (tx) => {
            // 1. Find all pending NODEOPS_PAYMENT intents for this period
            const pendingNodeOpsRows = tx.prepare(`
                SELECT id, operator_id FROM ledger_entries 
                WHERE type = 'NODEOPS_PAYMENT' AND status = 'pending' AND period_end = ?
            `).all([periodEnd]);

            if (pendingNodeOpsRows.length === 0) return;

            const successfulOperatorIds = [];

            // 2. Mark them posted (simulate upstream success)
            for (const row of pendingNodeOpsRows) {
                const res = tx.prepare(`
                    UPDATE ledger_entries SET status = 'posted', updated_at = ?
                    WHERE id = ?
                `).run([execNow, row.id]);

                if (res.changes > 0) {
                    postedNodeOps++;
                    successfulOperatorIds.push(row.operator_id);
                }
            }

            // 3. Uniq operator IDs
            const uniqueOperators = [...new Set(successfulOperatorIds)];

            // 4. For successful operators, unlock RESERVE_ALLOCATION and OPERATOR_PAYOUT
            if (uniqueOperators.length > 0) {
                const placeholders = uniqueOperators.map(() => '?').join(',');
                const queryArgs = [execNow, periodEnd, ...uniqueOperators];

                const reserveRes = tx.prepare(`
                    UPDATE ledger_entries SET status = 'posted', updated_at = ?
                    WHERE type = 'RESERVE_ALLOCATION' AND status = 'pending' AND period_end = ?
                    AND operator_id IN (${placeholders})
                `).run(queryArgs);
                postedReserve += reserveRes.changes;

                const payoutRes = tx.prepare(`
                    UPDATE ledger_entries SET status = 'posted', updated_at = ?
                    WHERE type = 'OPERATOR_PAYOUT' AND status = 'pending' AND period_end = ?
                    AND operator_id IN (${placeholders})
                `).run(queryArgs);
                postedPayouts += payoutRes.changes;
            }
        });

        const totalPosted = postedNodeOps + postedReserve + postedPayouts;

        return {
            executed: totalPosted,
            status: 'simulated_success',
            details: {
                posted_nodeops: postedNodeOps,
                posted_reserve: postedReserve,
                posted_payouts: postedPayouts,
                total_posted: totalPosted
            }
        };
    }

    _makeEntry(operatorId, period, type, amount, direction, status) {
        const now = Math.floor(Date.now() / 1000);
        return {
            id: crypto.randomUUID(),
            operator_id: operatorId,
            period_start: period.start,
            period_end: period.end,
            type,
            amount_usdt: Number(amount).toFixed(8),
            direction,
            status,
            created_at: now,
            updated_at: now
        };
    }
}
