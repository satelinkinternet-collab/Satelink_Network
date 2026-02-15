import crypto from 'crypto';

export class EconomicLedger {
    constructor(db) {
        this.db = db;
    }

    /**
     * Ensure an account exists (Idempotent)
     */
    /**
     * Ensure an account exists (Idempotent)
     */
    ensureAccount(accountKey, type, label) {
        this.db.prepare(`
            INSERT OR IGNORE INTO economic_accounts (account_key, account_type, label, created_at)
            VALUES (?, ?, ?, ?)
        `).run([accountKey, type, label, Date.now()]);
    }

    /**
     * Create a Double-Entry Transaction
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
                    tx.prepare(`
                        INSERT OR IGNORE INTO economic_accounts (account_key, account_type, label, created_at)
                        VALUES (?, ?, ?, ?)
                    `).run([line.account_key, line.account_type, line.label, now]);
                }
            }

            // B. Insert Lines & Chain
            let lineNo = 1;
            for (const line of lines) {
                // Insert Entry
                const res = tx.prepare(`
                    INSERT INTO economic_ledger_entries 
                    (txn_id, line_no, account_key, direction, amount_usdt, memo, event_type, reference_type, reference_id, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run([txnId, lineNo, line.account_key, line.direction, line.amount_usdt, memo, event_type, reference_type, reference_id, created_by, now]);

                const entryId = res.lastInsertRowid;

                // Get Last Hash
                const lastChain = tx.prepare("SELECT hash_current FROM economic_ledger_chain ORDER BY id DESC LIMIT 1").get([]);
                const prevHash = lastChain ? lastChain.hash_current : 'GENESIS';

                // Compute Current Hash
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
                tx.prepare(`
                    INSERT INTO economic_ledger_chain
                    (ledger_entry_id, txn_id, hash_prev, hash_current, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run([entryId, txnId, prevHash, currentHash, now]);

                lineNo++;
            }

            // C. Update Balances Cache
            const keys = new Set(lines.map(l => l.account_key));
            for (const key of keys) {
                const usage = tx.prepare(`
                    SELECT 
                        SUM(CASE WHEN direction='debit' THEN amount_usdt ELSE 0 END) as debits,
                        SUM(CASE WHEN direction='credit' THEN amount_usdt ELSE 0 END) as credits
                    FROM economic_ledger_entries WHERE account_key = ?
                `).get([key]);

                const bal = (usage?.debits || 0) - (usage?.credits || 0);

                tx.prepare(`
                    INSERT INTO economic_account_balances (account_key, balance_usdt, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(account_key) DO UPDATE SET balance_usdt=excluded.balance_usdt, updated_at=excluded.updated_at
                `).run([key, bal, now]);
            }
        });

        return { txnId };
    }

    getAccount(key) {
        return this.db.prepare("SELECT * FROM economic_accounts WHERE account_key = ?").get([key]);
    }

    getBalance(key) {
        const row = this.db.prepare("SELECT balance_usdt FROM economic_account_balances WHERE account_key = ?").get([key]);
        return row ? row.balance_usdt : 0;
    }
}
