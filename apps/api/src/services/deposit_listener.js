// apps/api/src/services/deposit_listener.js
// Polygon on-chain deposit watcher for RevenueVault
// Listens for Deposited(address indexed from, uint256 amount) events
// Credits wallet balance in PostgreSQL atomically with idempotency
// Chain: Polygon Amoy (80002) / Polygon Mainnet (137)

import { ethers } from 'ethers';

const REVENUE_VAULT_ABI = [
  'event Deposited(address indexed from, uint256 amount)'
];

// USDT uses 6 decimals on Polygon
const USDT_DECIMALS = 6;
const RECONNECT_DELAY_MS = 15_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const LOG_PREFIX = '[DepositListener]';

export class DepositListener {
  constructor(db, logger) {
    this.db = db;
    this.log = logger || console;
    this.provider = null;
    this.contract = null;
    this.running = false;
    this._heartbeat = null;
    this._reconnectTimer = null;
  }

  async start() {
    const rpcUrl = process.env.POLYGON_RPC_URL || process.env.RPC_URL;
    const vaultAddress = process.env.REVENUE_VAULT_ADDRESS;

    if (!vaultAddress) {
      this.log.warn(`${LOG_PREFIX} REVENUE_VAULT_ADDRESS not set — listener disabled`);
      return;
    }
    if (!rpcUrl) {
      this.log.warn(`${LOG_PREFIX} POLYGON_RPC_URL not set — listener disabled`);
      return;
    }

    this.rpcUrl = rpcUrl;
    this.vaultAddress = vaultAddress;
    await this._connect();
  }

  async _connect() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

      // Verify connection
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      this.log.info(`${LOG_PREFIX} Connected chain=${chainId} vault=${this.vaultAddress}`);

      this.contract = new ethers.Contract(
        this.vaultAddress,
        REVENUE_VAULT_ABI,
        this.provider
      );

      this.running = true;

      // Listen for Deposited events
      this.contract.on('Deposited', async (from, amount, event) => {
        await this._handleDeposit(from, amount, event);
      });

      // Provider error → reconnect (filter expiry is non-critical — ethers auto-recovers)
      this.provider.on('error', (err) => {
        const msg = err?.message || String(err);
        if (msg.includes('filter not found') || msg.includes('eth_getFilterChanges')) {
          this.log.debug?.(`${LOG_PREFIX} Filter expired (non-critical, ethers will auto-recover)`);
          return;
        }
        this.log.error(`${LOG_PREFIX} Provider error: ${msg} — reconnecting in ${RECONNECT_DELAY_MS}ms`);
        this._scheduleReconnect();
      });

      // Heartbeat log
      this._heartbeat = setInterval(async () => {
        try {
          const block = await this.provider.getBlockNumber();
          this.log.info(`${LOG_PREFIX} alive — block=${block}`);
        } catch (e) {
          this.log.warn(`${LOG_PREFIX} heartbeat failed: ${e.message}`);
        }
      }, HEARTBEAT_INTERVAL_MS);

    } catch (err) {
      this.log.error(`${LOG_PREFIX} Connection failed: ${err.message} — reconnecting in ${RECONNECT_DELAY_MS}ms`);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    this._cleanup();
    if (this.running) {
      this._reconnectTimer = setTimeout(() => this._connect(), RECONNECT_DELAY_MS);
    }
  }

  _cleanup() {
    if (this._heartbeat) { clearInterval(this._heartbeat); this._heartbeat = null; }
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this.contract) { this.contract.removeAllListeners(); this.contract = null; }
    if (this.provider) {
      try { this.provider.removeAllListeners(); } catch {}
      this.provider = null;
    }
  }

  async stop() {
    this.running = false;
    this._cleanup();
    this.log.info(`${LOG_PREFIX} stopped`);
  }

  async _handleDeposit(from, amount, event, manualChainId = null) {
    const wallet = from.toLowerCase();
    const txHash = event.log.transactionHash;
    const blockNumber = event.log.blockNumber;
    // Use provided chainId for manual mode, or get from provider
    const chainId = manualChainId || (this.provider ? Number((await this.provider.getNetwork()).chainId) : 137);

    // Convert from smallest unit (6 decimals for USDT) to human USDT
    const amountUsdt = parseFloat(ethers.formatUnits(amount, USDT_DECIMALS));

    this.log.info(`${LOG_PREFIX} Deposit detected: wallet=${wallet} amount=${amountUsdt} USDT tx=${txHash} block=${blockNumber}`);

    try {
      // ── Idempotency: skip if already processed
      const exists = await this.db.query(
        'SELECT id FROM credit_deposits WHERE tx_hash = $1',
        [txHash]
      );
      if (exists.rows.length > 0) {
        this.log.info(`${LOG_PREFIX} Already credited tx=${txHash} — skipping duplicate`);
        return;
      }

      // ── Atomic: insert deposit log + credit balance
      await this.db.query('BEGIN');

      try {
        // Append-only deposit record
        await this.db.query(
          `INSERT INTO credit_deposits
             (wallet_address, amount_usdt, tx_hash, block_number, chain_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [wallet, amountUsdt, txHash, blockNumber, chainId]
        );

        // Upsert credit balance
        await this.db.query(
          `INSERT INTO credit_balances
             (wallet_address, balance_usdt, total_deposited, last_deposit_tx, last_deposit_at, updated_at)
           VALUES ($1, $2, $2, $3, NOW(), NOW())
           ON CONFLICT (wallet_address) DO UPDATE SET
             balance_usdt    = credit_balances.balance_usdt + $2,
             total_deposited = credit_balances.total_deposited + $2,
             last_deposit_tx = $3,
             last_deposit_at = NOW(),
             updated_at      = NOW()`,
          [wallet, amountUsdt, txHash]
        );

        await this.db.query('COMMIT');

        this.log.info(`${LOG_PREFIX} Credited ${amountUsdt} USDT to ${wallet}`);

      } catch (innerErr) {
        await this.db.query('ROLLBACK');
        throw innerErr;
      }

    } catch (err) {
      this.log.error(
        `${LOG_PREFIX} Failed to credit deposit: ${err.message}`,
        { txHash, wallet, amountUsdt }
      );
    }
  }

  // Manual credit for testing (does not require on-chain event)
  async creditManual({ walletAddress, amountUsdt, txHash, blockNumber, chainId = 137 }) {
    const wallet = walletAddress.toLowerCase();
    if (!wallet.match(/^0x[0-9a-f]{40}$/)) throw new Error('Invalid wallet address');
    if (amountUsdt <= 0) throw new Error('Amount must be positive');

    const fakeEvent = {
      log: {
        transactionHash: txHash || `0xmanual_${Date.now()}`,
        blockNumber: blockNumber || 0
      }
    };

    // Pass chainId for manual mode (no provider available)
    await this._handleDeposit(wallet, ethers.parseUnits(String(amountUsdt), USDT_DECIMALS), fakeEvent, chainId);
    return { ok: true, wallet, amountUsdt };
  }
}
