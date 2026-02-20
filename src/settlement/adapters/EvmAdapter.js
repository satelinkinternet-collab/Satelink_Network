
import { BaseSettlementAdapter } from './BaseSettlementAdapter.js';
import { ethers } from 'ethers';

// CONSTANTS
const MAX_BATCH_ITEMS = 20;
const MAX_BATCH_TOTAL_USDT = 50.0; // Restrictive default

export class EvmAdapter extends BaseSettlementAdapter {
    constructor(db, config = {}) {
        super();
        this.db = db;
        // Config injected or loaded from env
        this.enabled = process.env.SETTLEMENT_EVM_ENABLED === '1';
        this.chainName = process.env.SETTLEMENT_EVM_CHAIN_NAME || 'UNKNOWN';
        this.rpcUrl = process.env.SETTLEMENT_EVM_RPC_URL;
        this.privateKey = process.env.SETTLEMENT_EVM_SIGNER_PRIVATE_KEY;
        this.nativeSymbol = process.env.SETTLEMENT_EVM_NATIVE_SYMBOL || 'ETH';

        // Token Map
        try {
            this.tokenMap = JSON.parse(process.env.SETTLEMENT_EVM_TOKEN_MAP_JSON || '{}');
        } catch (e) {
            console.error("[EvmAdapter] Failed to parse token map:", e);
            this.tokenMap = {};
        }

        // Initialize Provider & Signer if enabled
        if (this.enabled && this.rpcUrl && this.privateKey) {
            this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
            this.wallet = new ethers.Wallet(this.privateKey, this.provider);
        }
    }

    getName() {
        return `EVM:${this.chainName}`;
    }

    async estimateBatch(batch) {
        if (!this.enabled || !this.provider) throw new Error("EVM Adapter disabled or misconfigured");

        // Validation first
        const validation = await this.validateBatch(batch);
        if (!validation.valid) throw new Error(`Validation failed: ${validation.error}`);

        let totalGas = 0n;
        const itemEstimates = [];

        for (const item of batch.items) {
            let gas = 21000n; // default native transfer
            if (batch.currency !== this.nativeSymbol) {
                // ERC20 estimate
                const token = this.tokenMap[batch.currency];
                if (token) {
                    try {
                        const contract = new ethers.Contract(token.address, ["function transfer(address,uint256)"], this.provider);
                        const amountUnits = ethers.parseUnits(item.amount.toString(), token.decimals);
                        gas = await contract.transfer.estimateGas(item.wallet, amountUnits);
                    } catch (e) {
                        console.warn(`[EvmAdapter] Gas estimate failed for ${item.id}:`, e.message);
                        gas = 65000n; // fallback ERC20 transfer gas
                    }
                }
            }
            totalGas += gas;
            itemEstimates.push({ id: item.id, gas: gas.toString() });
        }

        // Get Gas Price
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 1n; // simple fallback
        const estimatedFeeNative = ethers.formatEther(totalGas * gasPrice);

        return {
            total_items: batch.items.length,
            total_amount: batch.total_amount,
            estimated_gas_total: totalGas.toString(),
            estimated_fee_native: estimatedFeeNative,
            currency: this.nativeSymbol,
            per_item_estimates: itemEstimates,
            meta: { gas_price: gasPrice.toString() }
        };
    }

    async validateBatch(batch) {
        if (!this.enabled) return { valid: false, error: "Adapter disabled via env" };

        // Cap checks
        if (batch.items.length > MAX_BATCH_ITEMS) return { valid: false, error: `Exceeds max items (${MAX_BATCH_ITEMS})` };
        if (batch.total_amount > MAX_BATCH_TOTAL_USDT && batch.currency === 'USDT') return { valid: false, error: `Exceeds max amount (${MAX_BATCH_TOTAL_USDT})` };

        // Currency check
        if (batch.currency !== this.nativeSymbol && !this.tokenMap[batch.currency]) {
            return { valid: false, error: `Unsupported currency: ${batch.currency}` };
        }

        // Address checks
        for (const item of batch.items) {
            if (!ethers.isAddress(item.wallet)) return { valid: false, error: `Invalid address: ${item.wallet}` };
            if (item.amount <= 0) return { valid: false, error: `Invalid amount: ${item.amount}` };
        }

        return { valid: true };
    }

    async createBatch(batch) {
        if (!this.enabled || !this.wallet) throw new Error("EVM Adapter disabled");

        // 1. Idempotency Check & Preparation
        // We track state in settlement_evm_txs
        const results = [];
        let itemsProcessed = 0;

        // Nonce Lock
        // We capture nonce once per batch attempt effectively, but really we need to lock per tx.
        // For simplicity/MVP, we'll process sequentially.

        // In a real system, we'd use a nonce manager service. 
        // Here, we grab current nonce + count of pending.

        let startNonce = await this.wallet.getNonce();
        // Check DB for any 'sent' but unconfirmed txs to ensure we don't reuse nonce?
        // Actually, ethers getNonce() handles pending if using correct provider.

        // However, better robustness: maintain local nonce counter in DB.
        // Let's rely on sequential execution for this MVP batch.

        for (const item of batch.items) {
            // Check if exists
            const existing = await this.db.get("SELECT * FROM settlement_evm_txs WHERE batch_id=? AND item_id=?", [batch.id, item.id]);

            if (existing && (existing.status === 'sent' || existing.status === 'confirmed')) {
                results.push({ item_id: item.id, status: existing.status, tx_hash: existing.tx_hash });
                continue;
            }

            // Prepare payload
            let txHash = null;
            let status = 'failed';

            try {
                // Send TX
                let txResponse;
                const nonce = startNonce++; // Simplistic nonce increment

                if (batch.currency === this.nativeSymbol) {
                    const amountWei = ethers.parseEther(item.amount.toString());
                    txResponse = await this.wallet.sendTransaction({
                        to: item.wallet,
                        value: amountWei,
                        nonce: nonce
                    });
                } else {
                    const token = this.tokenMap[batch.currency];
                    const contract = new ethers.Contract(token.address, [
                        "function transfer(address to, uint256 value) returns (bool)"
                    ], this.wallet);
                    const amountUnits = ethers.parseUnits(item.amount.toString(), token.decimals);
                    txResponse = await contract.transfer(item.wallet, amountUnits, { nonce: nonce });
                }

                txHash = txResponse.hash;
                status = 'sent';

                // Insert/Update DB
                if (existing) {
                    await this.db.query("UPDATE settlement_evm_txs SET status=?, tx_hash=?, updated_at=?, nonce=? WHERE id=?",
                        ['sent', txHash, Date.now(), nonce, existing.id]);
                } else {
                    await this.db.query(`
                        INSERT INTO settlement_evm_txs (batch_id, item_id, chain_name, asset_symbol, to_address, amount_atomic, nonce, tx_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [batch.id, item.id, this.chainName, batch.currency, item.wallet, item.amount.toString(), nonce, txHash, 'sent', Date.now(), Date.now()]);
                }

                // Wait for 1 confirmation (MVP blocking, or we return 'sent' and let status check handle it)
                // To keep engine simple, let's wait for 1 connfirmation if it's fast (testnet). 
                // But generally, we should return 'submitted' and have a poller.
                // Given the Requirement "running -> completed only when all items confirmed", we can return 'processing' status to engine.

                // For MVP: let's NOT wait here, just return sent. Engine polls? 
                // Engine doesn't have a poller yet.
                // Engine loop calls createBatch. createBatch can block?? No, that timeouts.
                // The engine needs `getBatchStatus` to pull updates.

            } catch (e) {
                console.error(`[EvmAdapter] Item ${item.id} failed:`, e);
                // Log failure
                if (existing) {
                    await this.db.query("UPDATE settlement_evm_txs SET status='failed', error_message=?, updated_at=? WHERE id=?", [e.message, Date.now(), existing.id]);
                } else {
                    await this.db.query(`
                        INSERT INTO settlement_evm_txs (batch_id, item_id, chain_name, asset_symbol, to_address, amount_atomic, status, error_message, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?)
                    `, [batch.id, item.id, this.chainName, batch.currency, item.wallet, item.amount.toString(), e.message, Date.now(), Date.now()]);
                }
            }
        }

        return {
            status: 'processing', // Signal engine strictly that we are async
            external_ref: `EVM:${this.chainName}:${batch.id}`
        };
    }

    async getBatchStatus(external_ref) {
        if (!external_ref.startsWith('EVM:')) return { status: 'unknown' };

        // Parse ID from ref? Or just usage internal query. 
        // external_ref format: EVM:<chain>:<batch_id>
        const parts = external_ref.split(':');
        const batchId = parts[2];

        // Check DB for all items
        const txs = await this.db.query("SELECT * FROM settlement_evm_txs WHERE batch_id = ?", [batchId]);

        if (txs.length === 0) return { status: 'queued' };

        const failed = txs.filter(t => t.status === 'failed').length;
        const confirmed = txs.filter(t => t.status === 'confirmed').length;
        const sent = txs.filter(t => t.status === 'sent').length;
        const total = txs.length;

        // logic: if any failed -> failed? or partial? Req says 'fail batch if any fails'
        if (failed > 0) return { status: 'failed', meta: { failed_count: failed } };

        if (confirmed === total && total > 0) return { status: 'completed', completed_at: Date.now() };

        // Check confirmations for 'sent' items
        if (sent > 0 && this.provider) {
            // Polling logic here or just rely on status check call
            for (const tx of txs.filter(t => t.status === 'sent')) {
                try {
                    const receipt = await this.provider.getTransactionReceipt(tx.tx_hash);
                    if (receipt && receipt.status === 1) { // 1 = success
                        await this.db.query("UPDATE settlement_evm_txs SET status='confirmed', updated_at=? WHERE id=?", [Date.now(), tx.id]);
                    } else if (receipt && receipt.status === 0) {
                        await this.db.query("UPDATE settlement_evm_txs SET status='failed', error_message='Reverted', updated_at=? WHERE id=?", [Date.now(), tx.id]);
                    }
                } catch (e) {
                    // ignore transient RPC error
                }
            }
            // re-evaluate
            return { status: 'processing', meta: { sent, confirmed } };
        }

        return { status: 'processing', meta: { sent, confirmed } };
    }

    async cancelBatch(external_ref) {
        return { success: false, error: "Cannot cancel on-chain batch" };
    }

    async healthCheck() {
        if (!this.enabled) return { ok: false, error: "Configuration disabled" };
        const start = Date.now();
        try {
            await this.provider.getBlockNumber();
            const latency = Date.now() - start;
            return { ok: true, latency_ms: latency, signer: this.wallet ? this.wallet.address.substring(0, 6) + '...' : 'None' };
        } catch (e) {
            return { ok: false, error: e.message, latency_ms: Date.now() - start };
        }
    }
}
