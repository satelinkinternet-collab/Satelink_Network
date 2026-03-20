/**
 * BatchCreator — Converts pending withdrawals into settlement batches.
 *
 * Pipeline: withdrawal (PENDING) → payout_batches_v2 (queued) + payout_items_v2
 *
 * Runs on a timer from server.js. Groups withdrawals by wallet,
 * creates batches of up to BATCH_SIZE items, and marks withdrawals as BATCHED.
 */

import crypto from 'crypto';

const BATCH_SIZE = parseInt(process.env.SETTLEMENT_BATCH_SIZE) || 20;

export class BatchCreator {
    constructor(db) {
        this.db = db;
    }

    /**
     * Scan pending withdrawals and create settlement batches.
     * Each batch groups up to BATCH_SIZE withdrawal records.
     */
    async createBatches() {
        const pending = await this.db.query(
            "SELECT * FROM withdrawals WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT ?",
            [BATCH_SIZE * 5] // Process up to 5 batches per cycle
        );

        if (!pending || pending.length === 0) return [];

        // Group by wallet to consolidate payouts
        const byWallet = new Map();
        for (const w of pending) {
            const key = w.wallet;
            if (!byWallet.has(key)) byWallet.set(key, []);
            byWallet.get(key).push(w);
        }

        // Flatten into batch-sized chunks
        const allItems = [];
        for (const [wallet, withdrawals] of byWallet) {
            for (const w of withdrawals) {
                allItems.push({ wallet, withdrawal: w });
            }
        }

        const batches = [];
        for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
            const chunk = allItems.slice(i, i + BATCH_SIZE);
            const batch = await this._createBatch(chunk);
            if (batch) batches.push(batch);
        }

        return batches;
    }

    async _createBatch(items) {
        const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.withdrawal.amount_usdt) || 0), 0);
        const now = Date.now();

        // Insert batch record
        await this.db.query(
            `INSERT INTO payout_batches_v2 (id, adapter_type, status, total_amount, currency, item_count, created_at, updated_at)
             VALUES (?, ?, 'queued', ?, 'USDT', ?, ?, ?)`,
            [batchId, 'SIMULATED', totalAmount, items.length, now, now]
        );

        // Insert individual payout items
        for (const item of items) {
            const itemId = `item_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            await this.db.query(
                `INSERT INTO payout_items_v2 (id, batch_id, wallet, amount, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
                [itemId, batchId, item.wallet, parseFloat(item.withdrawal.amount_usdt) || 0, now, now]
            );

            // Mark the original withdrawal as BATCHED
            await this.db.query(
                "UPDATE withdrawals SET status = 'BATCHED' WHERE id = ?",
                [item.withdrawal.id]
            );
        }

        console.log(`[BatchCreator] Created batch ${batchId} with ${items.length} items, total: ${totalAmount} USDT`);
        return { batchId, itemCount: items.length, totalAmount };
    }
}
