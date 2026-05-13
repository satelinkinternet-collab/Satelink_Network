/**
 * MEV Relay Client
 * L8-002: Satelink MEV private relay for searchers
 *
 * Features:
 * - Private transaction submission
 * - Bundle submission (Flashbots-compatible)
 * - Bundle simulation (eth_callBundle)
 * - Bundle status tracking
 */

export interface MevSubmitResult {
  ok: boolean;
  txHash?: string;
  bundleHash?: string;
  provider?: string;
  requestId?: string;
  priceUsdt?: number;
  error?: string;
}

export interface MevSimulationResult {
  ok: boolean;
  simulation?: {
    bundleHash?: string;
    coinbaseDiff?: string;
    ethSentToCoinbase?: string;
    gasFees?: string;
    totalGasUsed?: number;
    results?: unknown[];
  };
  profitable?: boolean;
  latency_ms?: number;
  fee_usdt?: number;
  error?: string;
  requestId?: string;
}

export interface MevBundleStatus {
  ok: boolean;
  bundleHash: string;
  status: 'pending' | 'pending_high_priority' | 'not_found' | 'unknown';
  stats?: {
    isSimulated?: boolean;
    isSentToMiners?: boolean;
    isHighPriority?: boolean;
    simulatedAt?: string;
    submittedAt?: string;
    sentToMinersAt?: string;
  };
  fee_usdt?: number;
  error?: string;
}

export interface MevClientOptions {
  apiKey: string;
  baseUrl?: string;
  chain?: 'ethereum' | 'polygon' | 'arbitrum';
}

const DEFAULT_BASE_URL = 'https://rpc.satelink.network';

export class SatelinkMEV {
  private apiKey: string;
  private baseUrl: string;
  private chain: string;

  constructor(options: MevClientOptions) {
    if (!options.apiKey) {
      throw new Error('MEV relay requires an API key');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.chain = options.chain || 'ethereum';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  /**
   * Submit a signed transaction to the private mempool
   * Transaction is NOT broadcast publicly — goes directly to validators
   */
  async submitPrivateTransaction(signedTx: string): Promise<MevSubmitResult> {
    const response = await fetch(`${this.baseUrl}/rpc/mev?chain=${this.chain}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_sendRawTransaction',
        params: [signedTx]
      })
    });

    const data = await response.json();

    if (data.error) {
      return { ok: false, error: data.error.message || data.error };
    }

    return {
      ok: true,
      txHash: data.result,
      provider: data._mev?.provider,
      requestId: data._mev?.requestId,
      priceUsdt: data._mev?.priceUsdt
    };
  }

  /**
   * Submit a bundle of transactions (Flashbots-compatible)
   * All transactions execute atomically or none do
   */
  async submitBundle(
    txs: string[],
    options: {
      blockNumber?: string | number;
      minTimestamp?: number;
      maxTimestamp?: number;
    } = {}
  ): Promise<MevSubmitResult> {
    const response = await fetch(`${this.baseUrl}/rpc/mev/bundle?chain=${this.chain}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        txs,
        blockNumber: options.blockNumber,
        minTimestamp: options.minTimestamp,
        maxTimestamp: options.maxTimestamp
      })
    });

    const data = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.error || data.message };
    }

    return {
      ok: true,
      bundleHash: data.bundleHash,
      provider: data.provider,
      requestId: data.requestId,
      priceUsdt: data.priceUsdt
    };
  }

  /**
   * Simulate a bundle without submitting (eth_callBundle)
   * Use this to check profitability before paying for submission
   */
  async simulateBundle(
    txs: string[],
    options: {
      blockNumber?: string;
      stateBlockNumber?: string;
    } = {}
  ): Promise<MevSimulationResult> {
    const response = await fetch(`${this.baseUrl}/rpc/mev/bundle/simulate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        txs,
        blockNumber: options.blockNumber,
        stateBlockNumber: options.stateBlockNumber
      })
    });

    return response.json();
  }

  /**
   * Check if a bundle was included on-chain
   */
  async getBundleStatus(bundleHash: string, blockNumber?: string): Promise<MevBundleStatus> {
    const url = new URL(`${this.baseUrl}/rpc/mev/bundle/${bundleHash}`);
    if (blockNumber) url.searchParams.set('blockNumber', blockNumber);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders()
    });

    return response.json();
  }

  /**
   * Get MEV relay status and stats
   */
  async getStatus(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/rpc/mev/status`);
    return response.json();
  }

  /**
   * Set the target chain for MEV operations
   */
  setChain(chain: 'ethereum' | 'polygon' | 'arbitrum'): void {
    this.chain = chain;
  }
}

/**
 * Create a Satelink MEV client
 */
export function createMevClient(options: MevClientOptions): SatelinkMEV {
  return new SatelinkMEV(options);
}
