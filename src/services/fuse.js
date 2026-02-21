/**
 * fuse.js — PRODUCTION (ESM)
 *
 * AUDIT FIX (HIGH): Previously had contractAddress: '0x...STUB...'
 * with mock settlement returning fake tx hashes.
 *
 * Now: Real Fuse Network USDT contract interaction via ethers.js
 * Reads from FUSE_USDT_CONTRACT, FUSE_RPC_URL env vars.
 * connect() must be called explicitly when FEATURE_REAL_SETTLEMENT=true.
 */

import { ethers } from 'ethers';
import EventEmitter from 'events';

// Minimal USDT ABI (ERC20)
const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const VAULT_ABI = [
  'function deposit(uint256 amount) external',
  'function withdraw(address to, uint256 amount) external',
  'function balance() external view returns (uint256)',
  'event Deposited(address indexed from, uint256 amount)',
  'event Withdrawn(address indexed to, uint256 amount)',
];

export class FuseService extends EventEmitter {
  #provider  = null;
  #signer    = null;
  #usdt      = null;
  #vault     = null;
  #decimals  = 6;   // USDT uses 6 decimals
  #connected = false;

  constructor() {
    super();
    this.network = {
      name:    'Fuse',
      chainId: parseInt(process.env.FUSE_CHAIN_ID || '122'),
      rpcUrl:  process.env.FUSE_RPC_URL || 'https://rpc.fuse.io',
    };
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  async connect() {
    const usdtAddress  = process.env.FUSE_USDT_CONTRACT;
    const vaultAddress = process.env.REVENUE_VAULT_CONTRACT;
    const signerKey    = process.env.SETTLEMENT_EVM_SIGNER_PRIVATE_KEY;

    if (!usdtAddress || usdtAddress.includes('REPLACE')) {
      throw new Error('[FuseService] FUSE_USDT_CONTRACT not configured. Check .env');
    }
    if (!signerKey || signerKey.includes('REPLACE')) {
      throw new Error('[FuseService] SETTLEMENT_EVM_SIGNER_PRIVATE_KEY not configured. Use KMS in prod.');
    }

    this.#provider = new ethers.JsonRpcProvider(this.network.rpcUrl);

    // Verify we're on the right network
    const network = await this.#provider.getNetwork();
    if (Number(network.chainId) !== this.network.chainId) {
      throw new Error(
        `[FuseService] Wrong network. Expected chainId ${this.network.chainId}, got ${network.chainId}`
      );
    }

    this.#signer   = new ethers.Wallet(signerKey, this.#provider);
    this.#usdt     = new ethers.Contract(usdtAddress, USDT_ABI, this.#signer);
    this.#decimals = await this.#usdt.decimals();

    if (vaultAddress && !vaultAddress.includes('REPLACE')) {
      this.#vault = new ethers.Contract(vaultAddress, VAULT_ABI, this.#signer);
    }

    this.#connected = true;
    console.log(`[FuseService] Connected to Fuse Network (chainId: ${this.network.chainId})`);
    console.log(`[FuseService] Signer: ${this.#signer.address}`);
    console.log(`[FuseService] USDT contract: ${usdtAddress}`);

    this.emit('connected', { chainId: this.network.chainId, signer: this.#signer.address });
    return this;
  }

  // ─── Balance & Info ────────────────────────────────────────────────────────

  async getBalance(address) {
    this._assertConnected();
    const raw = await this.#usdt.balanceOf(address);
    return this._fromUsdt(raw);
  }

  async getSignerAddress() {
    this._assertConnected();
    return this.#signer.address;
  }

  async getGasPrice() {
    const feeData = await this.#provider.getFeeData();
    return {
      gasPrice:     ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'),
      maxFeePerGas: feeData.maxFeePerGas
        ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei')
        : null,
    };
  }

  // ─── Settlement ────────────────────────────────────────────────────────────

  /**
   * Send USDT to a recipient
   * @param {string} toAddress - Recipient wallet address
   * @param {number} amountUsdt - Human-readable USDT (e.g., 12.50)
   */
  async settle(toAddress, amountUsdt) {
    this._assertConnected();

    if (!ethers.isAddress(toAddress)) {
      throw new Error(`[FuseService] Invalid recipient address: ${toAddress}`);
    }
    if (!amountUsdt || amountUsdt <= 0) {
      throw new Error(`[FuseService] Invalid amount: ${amountUsdt}`);
    }

    const amountRaw = this._toUsdt(amountUsdt);

    // Check signer balance
    const balance = await this.#usdt.balanceOf(this.#signer.address);
    if (balance < amountRaw) {
      throw new Error(
        `[FuseService] Insufficient USDT balance. Have: ${this._fromUsdt(balance)}, Need: ${amountUsdt}`
      );
    }

    console.log(`[FuseService] Settling ${amountUsdt} USDT → ${toAddress}`);

    const gasEstimate = await this.#usdt.transfer.estimateGas(toAddress, amountRaw);
    const gasLimit    = (gasEstimate * 120n) / 100n; // 20% buffer

    const tx = await this.#usdt.transfer(toAddress, amountRaw, { gasLimit });
    console.log(`[FuseService] Tx submitted: ${tx.hash}`);

    this.emit('settlementPending', { txHash: tx.hash, to: toAddress, amount: amountUsdt });

    const confirmations = parseInt(process.env.SETTLEMENT_CONFIRMATIONS || '2');
    const receipt = await tx.wait(confirmations);

    if (!receipt || receipt.status === 0) {
      throw new Error(`[FuseService] Transaction failed: ${tx.hash}`);
    }

    const result = {
      txHash:       receipt.hash,
      blockNumber:  receipt.blockNumber,
      confirmations,
      gasUsed:      receipt.gasUsed.toString(),
      to:           toAddress,
      amount:       amountUsdt,
      amountRaw:    amountRaw.toString(),
      timestamp:    Date.now(),
      network:      'fuse',
      chainId:      this.network.chainId,
      status:       'confirmed',
    };

    console.log(`[FuseService] Settlement confirmed: ${tx.hash} (block ${receipt.blockNumber})`);
    this.emit('settlementConfirmed', result);
    return result;
  }

  /**
   * Batch settle multiple recipients in sequence
   * @param {Array<{address, amountUsdt, settlementId}>} recipients
   */
  async settleBatch(recipients) {
    this._assertConnected();
    const results = [];
    const errors  = [];

    for (const { address, amountUsdt, settlementId } of recipients) {
      try {
        const receipt = await this.settle(address, amountUsdt);
        results.push({ settlementId, ...receipt, success: true });
      } catch (err) {
        console.error(`[FuseService] Batch item failed: ${settlementId} →`, err.message);
        errors.push({ settlementId, address, amountUsdt, error: err.message, success: false });
        const delay = Math.min(1000 * Math.pow(2, errors.length), 30000);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    return { results, errors, total: recipients.length, successful: results.length };
  }

  /**
   * Watch for incoming USDT to vault
   */
  startVaultMonitor() {
    this._assertConnected();
    const vaultAddress = process.env.REVENUE_VAULT_CONTRACT;
    if (!vaultAddress || !this.#usdt) return;

    console.log('[FuseService] Starting vault transfer monitor...');
    this.#usdt.on('Transfer', (from, to, amount) => {
      if (to.toLowerCase() === vaultAddress.toLowerCase()) {
        this.emit('vaultDeposit', { from, amount: this._fromUsdt(amount), timestamp: Date.now() });
      }
    });
  }

  // ─── Health Check ─────────────────────────────────────────────────────────

  async healthCheck() {
    try {
      const block = await this.#provider.getBlockNumber();
      const signerBalance = this.#signer
        ? await this.#usdt.balanceOf(this.#signer.address)
        : 0n;

      return {
        connected:     this.#connected,
        blockNumber:   block,
        chainId:       this.network.chainId,
        signerAddress: this.#signer?.address,
        usdtBalance:   this._fromUsdt(signerBalance),
        rpcUrl:        this.network.rpcUrl,
        status:        'healthy',
        isStub:        false,
      };
    } catch (err) {
      return { connected: false, status: 'unhealthy', error: err.message, isStub: false };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _toUsdt(amount)  { return ethers.parseUnits(amount.toString(), this.#decimals); }
  _fromUsdt(raw)   { return parseFloat(ethers.formatUnits(raw, this.#decimals)); }

  _assertConnected() {
    if (!this.#connected) throw new Error('[FuseService] Not connected. Call connect() first.');
  }

  get isConnected() { return this.#connected; }
}

// Export singleton — call .connect() explicitly when FEATURE_REAL_SETTLEMENT=true
export default new FuseService();
