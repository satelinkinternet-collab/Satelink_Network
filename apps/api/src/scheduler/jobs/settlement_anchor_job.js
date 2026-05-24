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
    constructor(pool) {
        this.pool = pool;
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
        const result = await this.pool.query(`
            SELECT e.id, e.total_revenue_usdt, e.platform_share_usdt, e.ends_at
            FROM epochs e
            LEFT JOIN settlement_batches sb ON sb.epoch_id = e.id
            WHERE e.status = 'CLOSED'
              AND sb.id IS NULL
              AND e.total_revenue_usdt > 0
            ORDER BY e.id ASC
            LIMIT 10
        `);
        const unanchored = result.rows;

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
        await this.pool.query(`
            INSERT INTO settlement_batches
            (batch_id, epoch_id, chain_id, adapter_type, total_amount_usdt, item_count, status, created_at)
            VALUES ($1, $2, $3, 'polygon_anchor', $4, 1, 'pending', $5)
        `, [batchId, epoch.id, chainId, epoch.platform_share_usdt || 0, now]);

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
                const targetAddress = treasuryAddress && ethers.isAddress(treasuryAddress)
                    ? treasuryAddress
                    : this.wallet.address; // Fallback: self-transfer for testing

                // Try USDT transfer first, fallback to native MATIC anchor
                let usdtSuccess = false;
                if (amount > 0 && this.contract) {
                    try {
                        const decimals = parseInt(process.env.POLYGON_USDT_DECIMALS || '6', 10);
                        const roundedAmount = Math.floor(amount * 10 ** decimals) / 10 ** decimals;
                        const amountUnits = ethers.parseUnits(roundedAmount.toFixed(decimals), decimals);

                        const balance = await this.contract.balanceOf(this.wallet.address);
                        if (balance >= amountUnits) {
                            console.log(`[SettlementAnchor] Sending ${roundedAmount} USDT to ${targetAddress}`);
                            const tx = await this.contract.transfer(targetAddress, amountUnits);
                            const receipt = await tx.wait(1);
                            if (receipt && receipt.status === 1) {
                                txHash = tx.hash;
                                usdtSuccess = true;
                                console.log(`[SettlementAnchor] USDT TX confirmed: ${tx.hash}`);
                            }
                        }
                    } catch (usdtErr) {
                        console.warn(`[SettlementAnchor] USDT transfer failed: ${usdtErr.message}, falling back to MATIC anchor`);
                    }
                }

                // Fallback: send 0-value native tx as on-chain anchor proof
                if (!usdtSuccess) {
                    console.log(`[SettlementAnchor] Sending MATIC anchor tx for epoch ${epoch.id}`);
                    const anchorData = ethers.toUtf8Bytes(`SATELINK_EPOCH_${epoch.id}_${epoch.platform_share_usdt}`);
                    const tx = await this.wallet.sendTransaction({
                        to: targetAddress,
                        value: 0,
                        data: ethers.hexlify(anchorData)
                    });
                    console.log(`[SettlementAnchor] Anchor TX sent: ${tx.hash}`);
                    const receipt = await tx.wait(1);
                    if (!receipt || receipt.status !== 1) {
                        throw new Error('Anchor transaction reverted');
                    }
                    txHash = tx.hash;
                    console.log(`[SettlementAnchor] Anchor TX confirmed in block ${receipt.blockNumber}`);
                }
            } catch (e) {
                errorMessage = e.message;
                console.error(`[SettlementAnchor] TX failed: ${e.message}`);
            }
        }

        // 4. Update settlement_batches with result
        const confirmedAt = txHash && !errorMessage ? now : null;
        const status = errorMessage ? 'failed' : (txHash ? 'confirmed' : 'pending');

        await this.pool.query(`
            UPDATE settlement_batches
            SET tx_hash = $1, submitted_at = $2, confirmed_at = $3, status = $4, error_message = $5
            WHERE batch_id = $6
        `, [txHash, now, confirmedAt, status, errorMessage, batchId]);

        console.log(`[SettlementAnchor] Epoch ${epoch.id} anchored — status: ${status}, tx: ${txHash?.substring(0, 20)}...`);

        return { epoch_id: epoch.id, batch_id: batchId, tx_hash: txHash, status };
    }

    /**
     * Manually anchor a specific epoch (for testing/admin).
     */
    async anchorEpochById(epochId) {
        const epochResult = await this.pool.query(`
            SELECT id, total_revenue_usdt, platform_share_usdt, ends_at
            FROM epochs WHERE id = $1 AND status = 'CLOSED'
        `, [epochId]);
        const epoch = epochResult.rows[0];

        if (!epoch) {
            throw new Error(`Epoch ${epochId} not found or not closed`);
        }

        // Check if already anchored
        const existingResult = await this.pool.query(
            "SELECT batch_id FROM settlement_batches WHERE epoch_id = $1",
            [epochId]
        );
        const existing = existingResult.rows[0];

        if (existing) {
            throw new Error(`Epoch ${epochId} already has settlement batch: ${existing.batch_id}`);
        }

        return this.anchorEpoch(epoch);
    }
}

/**
 * Factory for use in server.js or scheduler
 */
export function createSettlementAnchorJob(pool) {
    return new SettlementAnchorJob(pool);
}
