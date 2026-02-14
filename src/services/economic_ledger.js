import crypto from 'crypto';

export class EconomicLedger {
    constructor(db) {
        this.db = db;
    }

    /**
     * Ensure an account exists (Idempotent)
     */
    async ensureAccount(accountKey, type, label) {
        // Cache check not needed if we trust SQLite unique constraint + IGNORE
        // But for perf, maybe checks? simpler is better.
        await this.db.query(`
            INSERT OR IGNORE INTO economic_accounts (account_key, account_type, label, created_at)
            VALUES (?, ?, ?, ?)
        `, [accountKey, type, label, Date.now()]);
    }

    /**
     * Create a Double-Entry Transaction
     * @param {Object} params
     * @param {string} params.event_type - revenue, reward, payout, adjustment
     * @param {string} params.reference_type - epoch, payout_batch, etc.
     * @param {string} params.reference_id
     * @param {string} params.memo
     * @param {string} params.created_by
     * @param {Array} params.lines - [{ account_key, direction, amount_usdt, account_type?, label? }]
     */
    async createTxn({ event_type, reference_type, reference_id, memo, created_by, lines }) {
        if (!lines || lines.length < 2) throw new Error("Transaction must have at least 2 lines");

        // 1. Validate Balance
        let sumDebit = 0;
        let sumCredit = 0;
        for (const line of lines) {
            if (line.amount_usdt < 0) throw new Error("Amounts must be non-negative");
            if (line.direction === 'debit') sumDebit += line.amount_usdt;
            else if (line.direction === 'credit') sumCredit += line.amount_usdt;
            else throw new Error(`Invalid direction: ${line.direction}`);
        }

        if (Math.abs(sumDebit - sumCredit) > 0.000001) {
            throw new Error(`Unbalanced Txn: Debit ${sumDebit} != Credit ${sumCredit}`);
        }

        const txnId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const now = Date.now();

        // 2. Execute Atomically
        await this.db.transaction(async (tx) => {
            // A. Ensure Accounts exist
            for (const line of lines) {
                if (line.account_type && line.label) {
                    await tx.query(`
                        INSERT OR IGNORE INTO economic_accounts (account_key, account_type, label, created_at)
                        VALUES (?, ?, ?, ?)
                    `, [line.account_key, line.account_type, line.label, now]);
                }
            }

            // B. Insert Lines & Chain
            let lineNo = 1;
            for (const line of lines) {
                // Insert Entry
                const res = await tx.query(`
                    INSERT INTO economic_ledger_entries 
                    (txn_id, line_no, account_key, direction, amount_usdt, memo, event_type, reference_type, reference_id, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING id
                `, [txnId, lineNo, line.account_key, line.direction, line.amount_usdt, memo, event_type, reference_type, reference_id, created_by, now]);

                const entryId = res.lastInsertRowid || res[0]?.id;

                // Get Last Hash
                const lastChain = await tx.get("SELECT hash_current FROM economic_ledger_chain ORDER BY id DESC LIMIT 1");
                const prevHash = lastChain ? lastChain.hash_current : 'GENESIS';

                // Compute Current Hash
                // Canonical JSON of entry fields that matter
                const canonical = JSON.stringify({
                    txn_id: txnId,
                    line_no: lineNo,
                    account_key: line.account_key,
                    direction: line.direction,
                    amount_usdt: line.amount_usdt,
                    event_type,
                    reference_type,
                    reference_id,
                    created_at: now
                });

                const currentHash = crypto.createHash('sha256').update(canonical + prevHash).digest('hex');

                // Insert Chain
                await tx.query(`
                    INSERT INTO economic_ledger_chain
                    (ledger_entry_id, txn_id, hash_prev, hash_current, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `, [entryId, txnId, prevHash, currentHash, now]);

                lineNo++;
            }

            // C. Update Balances Cache
            const keys = new Set(lines.map(l => l.account_key));
            for (const key of keys) {
                // Recalc entire balance for this key (safest)
                // debit - credit? 
                // In standard accounting: 
                // Assets/Expenses: Debit increases. 
                // Liab/Equity/Revenue: Credit increases.
                // BUT for simple "Balance" in a cache, we usually define one view.
                // Let's standard: Balance = Debits - Credits.
                // So Assets positive, Liabilities negative.
                // Wait, typically Treasury has money (Asset) -> Debit balance.
                // Revenue (Equity) -> Credit balance (negative number).
                // User Wallet (Liability to platform) -> Credit balance (negative).
                // Let's stick to: Balance = Debit - Credit.

                const usage = await tx.get(`
                    SELECT 
                        SUM(CASE WHEN direction='debit' THEN amount_usdt ELSE 0 END) as debits,
                        SUM(CASE WHEN direction='credit' THEN amount_usdt ELSE 0 END) as credits
                    FROM economic_ledger_entries WHERE account_key = ?
                `, [key]);

                const bal = (usage?.debits || 0) - (usage?.credits || 0);

                await tx.query(`
                    INSERT INTO economic_account_balances (account_key, balance_usdt, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(account_key) DO UPDATE SET balance_usdt=excluded.balance_usdt, updated_at=excluded.updated_at
                `, [key, bal, now]);
            }
        });

        return { txnId };
    }

    async getAccount(key) {
        return this.db.get("SELECT * FROM economic_accounts WHERE account_key = ?", [key]);
    }

    async getBalance(key) {
        const row = await this.db.get("SELECT balance_usdt FROM economic_account_balances WHERE account_key = ?", [key]);
        return row ? row.balance_usdt : 0;
    }
}
