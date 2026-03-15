
import { BaseSettlementAdapter } from './BaseSettlementAdapter.js';
import { ethers } from 'ethers';

// CONSTANTS
const MAX_BATCH_ITEMS = 20;
const MAX_BATCH_TOTAL_USDT = 50.0; // Restrictive default
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2000, 4000, 8000]; // Exponential backoff

// Conditional import for Defender to avoid breaking non-prod environments
let DefenderRelayProvider, DefenderRelaySigner;
try {
    const { RelaySigner, RelayProvider } = require('@openzeppelin/defender-sdk').ethers;
    DefenderRelayProvider = RelayProvider;
    DefenderRelaySigner = RelaySigner;
} catch (e) {
    // Optional dependency, handled below
}

export class EvmAdapter extends BaseSettlementAdapter {
    constructor(db, config = {}) {
        super();
        this.db = db;
        // Config injected or loaded from env
        this.enabled = process.env.SETTLEMENT_EVM_ENABLED === '1';
        this.chainName = process.env.SETTLEMENT_EVM_CHAIN_NAME || 'UNKNOWN';

        // Driver toggle: 'local' (private key) vs 'defender' (relayer API keys)
        this.driver = process.env.SETTLEMENT_EVM_DRIVER || 'local';

        // Local driver config
        this.rpcUrl = process.env.SETTLEMENT_EVM_RPC_URL;
        this.privateKey = process.env.SETTLEMENT_EVM_SIGNER_PRIVATE_KEY;

        // Defender driver config
        this.defenderApiKey = process.env.DEFENDER_KEY || process.env.RELAYER_API_KEY;
        this.defenderApiSecret = process.env.DEFENDER_SECRET || process.env.RELAYER_API_SECRET;

        this.nativeSymbol = process.env.SETTLEMENT_EVM_NATIVE_SYMBOL || 'ETH';

        // Token Map
        try {
            this.tokenMap = JSON.parse(process.env.SETTLEMENT_EVM_TOKEN_MAP_JSON || '{}');
        } catch (e) {
            console.error("[EvmAdapter] Failed to parse token map:", e);
            this.tokenMap = {};
        }

        // Initialize Provider & Signer if enabled
        if (this.enabled) {
            if (this.driver === 'defender' && this.defenderApiKey && this.defenderApiSecret && DefenderRelayProvider) {
                const credentials = { apiKey: this.defenderApiKey, apiSecret: this.defenderApiSecret };
                this.provider = new DefenderRelayProvider(credentials);
                this.wallet = new DefenderRelaySigner(credentials, this.provider, { speed: 'fast' });
                console.log(`[EvmAdapter] Initialized with Defender Relayer driver for chain ${this.chainName}`);
            } else if (this.driver === 'local' && this.rpcUrl && this.privateKey) {
                this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
                this.wallet = new ethers.Wallet(this.privateKey, this.provider);
                console.log(`[EvmAdapter] Initialized with Local driver for chain ${this.chainName}`);
            } else {
                console.warn(`[EvmAdapter] Enabled but driver ${this.driver} is missing configuration or dependencies.`);
            }
        }
    }

    getName() {
        return `EVM:${this.chainName}`;
    }

    /**
     * Local nonce manager: fetch from chain, check DB for pending txs to avoid collisions.
     */
    async _acquireNonce() {
        const onChainNonce = await this.wallet.getNonce('pending');
        // Check DB for max nonce we've used that is still 'sent' (not confirmed/failed)
        try {
            const row = this.db.prepare(
                `SELECT MAX(nonce) as max_nonce FROM settlement_evm_txs
                 WHERE chain_name = ? AND status = 'sent'`
            ).get([this.chainName]);
            if (row?.max_nonce != null && row.max_nonce >= onChainNonce) {
                return row.max_nonce + 1;
            }
        } catch (e) {
            // Table may not exist yet
        }
        return onChainNonce;
    }

    /**
     * Gas price oracle: fetch current gas price from Fuse RPC with fallback.
     */
    async _getGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            return feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('10', 'gwei');
        } catch (e) {
            console.warn('[EvmAdapter] Gas oracle failed, using fallback:', e.message);
            return ethers.parseUnits('10', 'gwei');
        }
    }

    /**
     * Retry wrapper with exponential backoff for transient failures.
     */
    async _withRetry(fn, context = '') {
        for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                return await fn();
            } catch (e) {
                const isLast = attempt === MAX_RETRY_ATTEMPTS;
                if (isLast) throw e;

                const isTransient = e.message?.includes('TIMEOUT') ||
                    e.message?.includes('nonce') ||
                    e.message?.includes('replacement fee too low') ||
                    e.code === 'NETWORK_ERROR' ||
                    e.code === 'SERVER_ERROR';

                if (!isTransient) throw e;

                const delay = RETRY_DELAYS_MS[attempt] || 8000;
                console.warn(`[EvmAdapter] ${context} attempt ${attempt + 1} failed: ${e.message}. Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
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

        // Nonce management: acquire starting nonce from chain + DB
        let currentNonce = await this._acquireNonce();
        const gasPrice = await this._getGasPrice();

        for (const item of batch.items) {
            // Idempotency: check if already processed
            let existing;
            try {
                existing = this.db.prepare(
                    "SELECT * FROM settlement_evm_txs WHERE batch_id=? AND item_id=?"
                ).get([batch.id, item.id]);
            } catch (e) { /* table may not exist */ }

            if (existing && (existing.status === 'sent' || existing.status === 'confirmed')) {
                results.push({ item_id: item.id, status: existing.status, tx_hash: existing.tx_hash });
                continue;
            }

            let txHash = null;
            let status = 'failed';

            try {
                // Send TX with retry for transient failures
                const nonce = currentNonce++;

                const txResponse = await this._withRetry(async () => {
                    if (batch.currency === this.nativeSymbol) {
                        const amountWei = ethers.parseEther(item.amount.toString());
                        return this.wallet.sendTransaction({
                            to: item.wallet,
                            value: amountWei,
                            nonce,
                            gasPrice
                        });
                    } else {
                        const token = this.tokenMap[batch.currency];
                        const contract = new ethers.Contract(token.address, [
                            "function transfer(address to, uint256 value) returns (bool)"
                        ], this.wallet);
                        const amountUnits = ethers.parseUnits(item.amount.toString(), token.decimals);
                        return contract.transfer(item.wallet, amountUnits, { nonce, gasPrice });
                    }
                }, `Item ${item.id}`);

                txHash = txResponse.hash;
                status = 'sent';

                // Persist to DB
                if (existing) {
                    this.db.prepare(
                        "UPDATE settlement_evm_txs SET status=?, tx_hash=?, updated_at=?, nonce=? WHERE id=?"
                    ).run(['sent', txHash, Date.now(), nonce, existing.id]);
                } else {
                    this.db.prepare(`
                        INSERT INTO settlement_evm_txs (batch_id, item_id, chain_name, asset_symbol, to_address, amount_atomic, nonce, tx_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run([batch.id, item.id, this.chainName, batch.currency, item.wallet, item.amount.toString(), nonce, txHash, 'sent', Date.now(), Date.now()]);
                }

            } catch (e) {
                console.error(`[EvmAdapter] Item ${item.id} failed after retries:`, e.message);
                if (existing) {
                    this.db.prepare(
                        "UPDATE settlement_evm_txs SET status='failed', error_message=?, updated_at=? WHERE id=?"
                    ).run([e.message, Date.now(), existing.id]);
                } else {
                    this.db.prepare(`
                        INSERT INTO settlement_evm_txs (batch_id, item_id, chain_name, asset_symbol, to_address, amount_atomic, status, error_message, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?)
                    `).run([batch.id, item.id, this.chainName, batch.currency, item.wallet, item.amount.toString(), e.message, Date.now(), Date.now()]);
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
