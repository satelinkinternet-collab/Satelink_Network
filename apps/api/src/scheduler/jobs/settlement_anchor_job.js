/**
 * SettlementAnchorJob — Anchors closed epochs to Polygon blockchain.
 *
 * Pipeline:
 * 1. Query closed epochs without matching settlement_batches row
 * 2. Create settlement_batches row with status=pending
 * 3. Submit on-chain tx (USDT transfer or anchor proof)
 * 4. Update tx_hash, confirmed_at, status=confirmed
 *
 * Config (env):
 *   POLYGON_RPC_URL        - Polygon RPC (Amoy: https://rpc-amoy.polygon.technology)
 *   POLYGON_SIGNER_KEY     - Hot wallet private key
 *   POLYGON_USDT_ADDRESS   - USDT contract on target chain
 *   POLYGON_CHAIN_ID       - Chain ID (80002 = Amoy, 137 = Mainnet)
 *   TREASURY_ADDRESS       - Destination for platform share transfers
 *   SETTLEMENT_DRY_RUN     - Set to '1' to simulate without sending tx
 */

import { ethers } from 'ethers';
import crypto from 'crypto';

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
];

export class SettlementAnchorJob {
    constructor(db) {
        this.db = db;
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.configured = false;

        this._init();
    }

    _init() {
        const rpcUrl = process.env.POLYGON_RPC_URL;
        const signerKey = process.env.POLYGON_SIGNER_KEY;
        const usdtAddress = process.env.POLYGON_USDT_ADDRESS;

        if (rpcUrl && signerKey && usdtAddress) {
            try {
                this.provider = new ethers.JsonRpcProvider(rpcUrl);
                this.wallet = new ethers.Wallet(signerKey, this.provider);
                this.contract = new ethers.Contract(usdtAddress, ERC20_ABI, this.wallet);
                this.configured = true;
                console.log(`[SettlementAnchor] Configured — signer: ${this.wallet.address.substring(0, 10)}...`);
            } catch (e) {
                console.warn(`[SettlementAnchor] Init failed: ${e.message}`);
            }
        } else {
            console.log('[SettlementAnchor] Not configured — running in simulation mode');
        }
    }

    /**
     * Main entry point — find unanchored epochs and anchor them.
     */
    async run() {
        console.log('[SettlementAnchor] Running...');

        // 1. Find closed epochs without settlement_batches
        const unanchored = await this.db.prepare(`
            SELECT e.id, e.total_revenue_usdt, e.platform_share_usdt, e.ends_at
            FROM epochs e
            LEFT JOIN settlement_batches sb ON sb.epoch_id = e.id
            WHERE e.status = 'CLOSED'
              AND sb.id IS NULL
              AND e.total_revenue_usdt > 0
            ORDER BY e.id ASC
            LIMIT 10
        `).all([]);

        if (unanchored.length === 0) {
            console.log('[SettlementAnchor] No unanchored epochs found');
            return { processed: 0 };
        }

        console.log(`[SettlementAnchor] Found ${unanchored.length} unanchored epochs`);

        let processed = 0;
        for (const epoch of unanchored) {
            try {
                await this.anchorEpoch(epoch);
                processed++;
            } catch (e) {
                console.error(`[SettlementAnchor] Failed to anchor epoch ${epoch.id}:`, e.message);
            }
        }

        return { processed };
    }

    /**
     * Anchor a single epoch to blockchain.
     */
    async anchorEpoch(epoch) {
        const batchId = `epoch_${epoch.id}_anchor_${crypto.randomBytes(4).toString('hex')}`;
        const chainId = parseInt(process.env.POLYGON_CHAIN_ID || '80002', 10);
        const now = Math.floor(Date.now() / 1000);
        const treasuryAddress = process.env.TREASURY_ADDRESS;

        // 2. Create pending settlement_batches row
        await this.db.prepare(`
            INSERT INTO settlement_batches
            (batch_id, epoch_id, chain_id, adapter_type, total_amount_usdt, item_count, status, created_at)
            VALUES (?, ?, ?, 'polygon_anchor', ?, 1, 'pending', ?)
        `).run([batchId, epoch.id, chainId, epoch.platform_share_usdt || 0, now]);

        console.log(`[SettlementAnchor] Created batch ${batchId} for epoch ${epoch.id}`);

        // 3. Submit on-chain transaction
        const isDryRun = process.env.SETTLEMENT_DRY_RUN === '1';
        let txHash = null;
        let errorMessage = null;

        if (isDryRun || !this.configured) {
            // Simulation mode
            txHash = `0xSIM_${crypto.randomBytes(32).toString('hex')}`;
            console.log(`[SettlementAnchor] SIMULATION — would send ${epoch.platform_share_usdt} USDT to ${treasuryAddress}`);
        } else {
            // Real transaction
            try {
                const amount = epoch.platform_share_usdt || 0;
                if (amount > 0 && treasuryAddress && ethers.isAddress(treasuryAddress)) {
                    const decimals = parseInt(process.env.POLYGON_USDT_DECIMALS || '6', 10);
                    const amountUnits = ethers.parseUnits(amount.toString(), decimals);

                    // Check balance
                    const balance = await this.contract.balanceOf(this.wallet.address);
                    if (balance < amountUnits) {
                        throw new Error(`Insufficient USDT: need ${amount}, have ${ethers.formatUnits(balance, decimals)}`);
                    }

                    // Send transfer
                    const tx = await this.contract.transfer(treasuryAddress, amountUnits);
                    console.log(`[SettlementAnchor] TX sent: ${tx.hash}`);

                    // Wait for confirmation
                    const receipt = await tx.wait(1);
                    if (!receipt || receipt.status !== 1) {
                        throw new Error('Transaction reverted');
                    }

                    txHash = tx.hash;
                    console.log(`[SettlementAnchor] Confirmed in block ${receipt.blockNumber}`);
                } else {
                    // No amount or no treasury — just record anchor hash
                    txHash = `0xANCHOR_${epoch.id}_${crypto.randomBytes(16).toString('hex')}`;
                    console.log(`[SettlementAnchor] No transfer needed — anchor hash: ${txHash}`);
                }
            } catch (e) {
                errorMessage = e.message;
                console.error(`[SettlementAnchor] TX failed: ${e.message}`);
            }
        }

        // 4. Update settlement_batches with result
        const confirmedAt = txHash && !errorMessage ? now : null;
        const status = errorMessage ? 'failed' : (txHash ? 'confirmed' : 'pending');

        await this.db.prepare(`
            UPDATE settlement_batches
            SET tx_hash = ?, submitted_at = ?, confirmed_at = ?, status = ?, error_message = ?
            WHERE batch_id = ?
        `).run([txHash, now, confirmedAt, status, errorMessage, batchId]);

        console.log(`[SettlementAnchor] Epoch ${epoch.id} anchored — status: ${status}, tx: ${txHash?.substring(0, 20)}...`);

        return { epoch_id: epoch.id, batch_id: batchId, tx_hash: txHash, status };
    }

    /**
     * Manually anchor a specific epoch (for testing/admin).
     */
    async anchorEpochById(epochId) {
        const epoch = await this.db.prepare(`
            SELECT id, total_revenue_usdt, platform_share_usdt, ends_at
            FROM epochs WHERE id = ? AND status = 'CLOSED'
        `).get([epochId]);

        if (!epoch) {
            throw new Error(`Epoch ${epochId} not found or not closed`);
        }

        // Check if already anchored
        const existing = await this.db.prepare(
            "SELECT batch_id FROM settlement_batches WHERE epoch_id = ?"
        ).get([epochId]);

        if (existing) {
            throw new Error(`Epoch ${epochId} already has settlement batch: ${existing.batch_id}`);
        }

        return this.anchorEpoch(epoch);
    }
}

/**
 * Factory for use in server.js or scheduler
 */
export function createSettlementAnchorJob(db) {
    return new SettlementAnchorJob(db);
}
