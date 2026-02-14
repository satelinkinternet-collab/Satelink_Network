
export class SettlementEngine {
    constructor(db, ledger, adapterRegistry, featureFlags) {
        this.db = db;
        this.ledger = ledger; // for verifying prior ledger entries, though Engine doesn't write new ones
        this.registry = adapterRegistry;
        this.featureFlags = featureFlags; // for checking settlement_adapter flag
    }

    async init() {
        // Load config
    }

    /**
     * Main loop to process queued batches
     */
    async processQueue() {
        // 1. Check if processing allowed (Safe Mode, etc.)
        const safe = await this._isSystemSafe();
        if (!safe) {
            console.log("[SettlementEngine] System unsafe/locked. Skipping cycle.");
            return;
        }

        // 2. Fetch Queued Batches
        const batches = await this.db.query("SELECT * FROM payout_batches_v2 WHERE status = 'queued' ORDER BY created_at ASC LIMIT 5");

        for (const batch of batches) {
            await this.processBatch(batch);
        }
    }

    async processBatch(batch) {
        console.log(`[SettlementEngine] Processing Batch ${batch.id}...`);

        // 3. Determine Adapter
        // Check system flag for override
        const flag = await this.db.get("SELECT value FROM system_flags WHERE key = 'settlement_adapter'");
        const adapterName = flag ? flag.value : 'SIMULATED';
        const adapter = this.registry.get(adapterName);

        if (!adapter) {
            console.error(`[SettlementEngine] Adapter ${adapterName} not found!`);
            return; // Stuck in queue
        }

        // 4. Update Status -> processing
        await this.db.query("UPDATE payout_batches_v2 SET status='processing', adapter_type=?, updated_at=? WHERE id=?", [adapterName, Date.now(), batch.id]);

        try {
            // 5. Populate Items
            batch.items = await this.db.query("SELECT * FROM payout_items_v2 WHERE batch_id = ?", [batch.id]);

            // 6. Validate
            const valid = await adapter.validateBatch(batch);
            if (!valid.valid) throw new Error(`Adapter validation failed: ${valid.error}`);

            // 7. Estimate (Optional logging)
            const est = await adapter.estimateBatch(batch);
            console.log(`[SettlementEngine] Est Fee: ${est.fee_amount} ${est.currency}`);

            // 8. Execute
            // Check for dry run
            const dryRun = await this.db.get("SELECT value FROM system_flags WHERE key = 'settlement_dry_run'");
            if (dryRun?.value === '1') {
                console.log("[SettlementEngine] DRY RUN - Simulating success");
                await this.db.query("UPDATE payout_batches_v2 SET status='completed', meta_json=?, completed_at=? WHERE id=?", [JSON.stringify({ dry_run: true }), Date.now(), batch.id]);
                return;
            }

            const result = await adapter.createBatch(batch);

            // 9. Update Final Status
            const status = result.status === 'completed' ? 'completed' : 'failed'; // adapters usually return 'submitted' or 'pending' then we poll.
            // For V1, we assume atomic or instant (Simulated) or we handle 'submitted'.
            // If 'submitted', we'd need a poller. 
            // Let's assume the adapter returns final state for Simulated, or 'submitted' for async.
            // If 'submitted', we update external_ref and stay in 'processing' or specific 'submitted' state.
            // The requirement says: queued -> running -> completed/failed.

            await this.db.query(`
                UPDATE payout_batches_v2 
                SET status=?, external_ref=?, tx_hash=?, meta_json=?, completed_at=?, updated_at=?
                WHERE id=?
            `, [
                result.status,
                result.external_ref,
                result.tx_hash || null,
                JSON.stringify(result.meta || {}),
                result.status === 'completed' ? Date.now() : null,
                Date.now(),
                batch.id
            ]);

            // 10. Shadow Mode Check
            await this._runShadowCheck(batch, result);

        } catch (e) {
            console.error(`[SettlementEngine] Batch ${batch.id} Failed:`, e);
            await this.db.query("UPDATE payout_batches_v2 SET status='failed', meta_json=?, updated_at=? WHERE id=?", [JSON.stringify({ error: e.message }), Date.now(), batch.id]);
        }
    }

    async _runShadowCheck(batch, primaryResult) {
        // ... (existing)
    }

    // [Phase 32] EVM Reconciliation
    async reconcileBatch(batchId) {
        // Force status check on adapter
        const batch = await this.db.get("SELECT * FROM payout_batches_v2 WHERE id=?", [batchId]);
        if (!batch) throw new Error("Batch not found");

        const adapterName = batch.adapter_type;
        const adapter = this.registry.get(adapterName);
        if (!adapter) throw new Error("Adapter not found");

        // Logic: getBatchStatus updates DB side-effects (e.g. EvmAdapter updates row statuses)
        // So we just call it and update the batch status.
        // But getBatchStatus requires external_ref.
        if (!batch.external_ref) throw new Error("Batch has no external_ref");

        const status = await adapter.getBatchStatus(batch.external_ref);

        // Update batch if changed
        if (status.status !== batch.status) {
            await this.db.query(`
                UPDATE payout_batches_v2 
                SET status=?, completed_at=?, updated_at=?
                WHERE id=?
            `, [
                status.status,
                status.status === 'completed' ? Date.now() : batch.completed_at,
                Date.now(),
                batch.id
            ]);
        }

        return { previous: batch.status, current: status.status, meta: status.meta };
    }

    async retryItem(batchId, itemId) {
        // Only for EVM adapter or those supporting retry.
        // EvmAdapter.createBatch is idempotent-ish but we might need explicit retry logic 
        // if the row is 'failed'. 
        // The adapter might need a 'retryItem' method or we reset the row status.
        // Ideally, Adapter handles 'createBatch' for specific items?
        // Or we reset the item row in DB and call createBatch again?

        // Let's implement: Reset settlement_evm_txs row to 'prepared' (or delete it if we want fresh nonce?)
        // If we delete it, we might lose history. 
        // Better: Update status='retry_requested' and call adapter.createBatch again.
        // Adapter needs to handle 'retry_requested' -> treat as new send.

        // Simplified: Delete the failed row in settlement_evm_txs logic? No, audit trail.
        // We'll update to 'cancelled' and let createBatch make a new one? 
        // EvmAdapter createBatch logic: "If settlement_evm_txs row exists ... with status in (sent,confirmed,prepared): skip".
        // So if we set it to 'failed' (which it is), createBatch WILL try again?
        // Let's check EvmAdapter logic:
        // "If settlement_evm_txs row exists (batch_id,item_id) with status in (sent,confirmed,prepared): skip"
        // So if status is 'failed', it will NOT skip. It will insert a NEW row? 
        // My schema has Unique Index on (batch_id, item_id). 
        // So it will FAIL to insert new row.

        // Correct fix: EvmAdapter needs to UPDATE the existing row if it is failed.
        // I need to update EvmAdapter to handle retry (status='failed' -> update to 'sent').

        // For now, Engine method:
        const batch = await this.db.get("SELECT * FROM payout_batches_v2 WHERE id=?", [batchId]);
        // Re-run createBatch. The Adapter must handle the DB constraint or update.
        // I'll update EvmAdapter in next step specifically for this.

        const adapter = this.registry.get(batch.adapter_type);
        return adapter.createBatch(batch); // This re-triggers the loop
    }


    async _logShadowMismatch(batchId, primary, shadow) {
        await this.db.query(`
            INSERT INTO settlement_shadow_log (batch_id, primary_json, shadow_json, created_at)
            VALUES (?, ?, ?, ?)
        `, [batchId, JSON.stringify(primary), JSON.stringify(shadow), Date.now()]);
    }

    async _isSystemSafe() {
        const safeMode = await this.db.get("SELECT value FROM system_flags WHERE key='safe_mode_enabled'");
        return safeMode?.value !== '1';
    }
}
