/**
 * PolygonUsdtAdapter — Single-transfer settlement adapter for USDT on Polygon PoS.
 *
 * Primary chain for Satelink settlement after Fuse deprecation.
 *
 * Config (env):
 *   POLYGON_RPC_URL        - Polygon JSON-RPC endpoint (mainnet https://polygon-rpc.com,
 *                            Amoy testnet https://rpc-amoy.polygon.technology)
 *   POLYGON_SIGNER_KEY     - Hot wallet private key
 *   POLYGON_USDT_ADDRESS   - USDT contract (mainnet 0xc2132D05D31c914a87C6611C10748AEb04B58e8F)
 *   POLYGON_USDT_DECIMALS  - Token decimals (default 6)
 *   POLYGON_CHAIN_ID       - Expected chain ID (default 137 = Polygon mainnet; 80002 = Amoy)
 */
import { ethers } from 'ethers';
import { BaseSettlementAdapter } from './BaseSettlementAdapter.js';

const ERC20_TRANSFER_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
];

export class PolygonUsdtAdapter extends BaseSettlementAdapter {
    constructor(config = {}) {
        super();
        this.rpcUrl = config.rpcUrl || process.env.POLYGON_RPC_URL;
        this.signerKey = config.signerKey || process.env.POLYGON_SIGNER_KEY;
        this.usdtAddress = config.usdtAddress || process.env.POLYGON_USDT_ADDRESS;
        this.decimals = parseInt(config.decimals || process.env.POLYGON_USDT_DECIMALS || '6', 10);
        this.expectedChainId = parseInt(config.chainId || process.env.POLYGON_CHAIN_ID || '137', 10);

        this.provider = null;
        this.wallet = null;
        this.contract = null;

        if (this.rpcUrl && this.signerKey && this.usdtAddress) {
            this._init();
        }
    }

    _init() {
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
        this.wallet = new ethers.Wallet(this.signerKey, this.provider);
        this.contract = new ethers.Contract(this.usdtAddress, ERC20_TRANSFER_ABI, this.wallet);
        console.log(`[PolygonUsdtAdapter] Initialized — signer: ${this.wallet.address.substring(0, 10)}...`);
    }

    getName() {
        return 'POLYGON_USDT';
    }

    // ────────────────────────────────────────────
    // Primary method for WithdrawService
    // ────────────────────────────────────────────

    /**
     * withdraw — send USDT to a single recipient.
     *
     * @param {object} params
     * @param {string} params.to     - Recipient address
     * @param {number} params.amount - Amount in human-readable USDT
     * @returns {Promise<{ txHash: string }>}
     */
    async withdraw({ to, amount }) {
        this._ensureReady();

        if (!ethers.isAddress(to)) {
            throw new Error(`Invalid recipient address: ${to}`);
        }
        if (amount <= 0) {
            throw new Error(`Invalid amount: ${amount}`);
        }

        const network = await this.provider.getNetwork();
        if (Number(network.chainId) !== this.expectedChainId) {
            throw new Error(`Wrong chain: expected ${this.expectedChainId}, got ${network.chainId}`);
        }

        const amountUnits = ethers.parseUnits(amount.toString(), this.decimals);

        const balance = await this.contract.balanceOf(this.wallet.address);
        if (balance < amountUnits) {
            const err = new Error(
                `Insufficient USDT: need ${amount}, have ${ethers.formatUnits(balance, this.decimals)}`
            );
            err.code = 'INSUFFICIENT_FUNDS';
            throw err;
        }

        const nativeBalance = await this.provider.getBalance(this.wallet.address);
        if (nativeBalance === 0n) {
            const err = new Error('Zero native balance — cannot pay gas');
            err.code = 'INSUFFICIENT_FUNDS';
            throw err;
        }

        const tx = await this.contract.transfer(to, amountUnits);
        console.log(`[PolygonUsdtAdapter] TX sent: ${tx.hash}`);

        const receipt = await tx.wait(1);

        if (!receipt || receipt.status !== 1) {
            throw new Error(`Transaction reverted: ${tx.hash}`);
        }

        console.log(`[PolygonUsdtAdapter] Confirmed block: ${receipt.blockNumber}, gas: ${receipt.gasUsed}`);

        return { txHash: tx.hash };
    }

    // ────────────────────────────────────────────
    // BaseSettlementAdapter batch interface
    // ────────────────────────────────────────────

    async estimateBatch(batch) {
        this._ensureReady();
        const gasPerTransfer = 65000n;
        const totalGas = gasPerTransfer * BigInt(batch.items.length);
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 1n;
        return {
            total_items: batch.items.length,
            estimated_gas_total: totalGas.toString(),
            fee_amount: parseFloat(ethers.formatEther(totalGas * gasPrice)),
            currency: 'MATIC',
        };
    }

    async validateBatch(batch) {
        if (!this.wallet) return { valid: false, error: 'Adapter not configured' };
        for (const item of batch.items) {
            if (!ethers.isAddress(item.wallet)) return { valid: false, error: `Invalid address: ${item.wallet}` };
            if ((item.amount_usdt || item.amount) <= 0) return { valid: false, error: 'Invalid amount' };
        }
        return { valid: true };
    }

    async createBatch(batch) {
        this._ensureReady();
        for (const item of batch.items) {
            await this.withdraw({ to: item.wallet, amount: item.amount_usdt || item.amount });
        }
        return { status: 'completed', external_ref: `POLYGON:${batch.id}` };
    }

    async getBatchStatus(_externalRef) {
        return { status: 'completed' };
    }

    async cancelBatch(_externalRef) {
        return { success: false, error: 'Cannot cancel on-chain transfers' };
    }

    async healthCheck() {
        if (!this.provider) return { ok: false, error: 'Not configured' };
        const start = Date.now();
        try {
            await this.provider.getBlockNumber();
            return { ok: true, latency_ms: Date.now() - start };
        } catch (e) {
            return { ok: false, error: e.message, latency_ms: Date.now() - start };
        }
    }

    _ensureReady() {
        if (!this.wallet || !this.contract) {
            throw new Error('PolygonUsdtAdapter not configured — check POLYGON_RPC_URL, POLYGON_SIGNER_KEY, POLYGON_USDT_ADDRESS');
        }
    }
}
