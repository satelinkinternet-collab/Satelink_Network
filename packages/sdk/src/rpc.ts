import type { SatelinkRPCOptions, JsonRpcRequest, JsonRpcResponse, TransactionRequest } from './types.js';

const DEFAULT_BASE_URL = 'https://rpc.satelink.network';
const DEFAULT_CHAIN = 'polygon';

export class SatelinkRPC {
  private apiKey?: string;
  private chain: string;
  private baseUrl: string;
  private requestId = 0;

  constructor(options: SatelinkRPCOptions = {}) {
    this.apiKey = options.apiKey;
    this.chain = options.chain || DEFAULT_CHAIN;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  }

  private getNextId(): number {
    return ++this.requestId;
  }

  private getRpcUrl(): string {
    return `${this.baseUrl}/rpc/${this.chain}`;
  }

  async request<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.getNextId()
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(this.getRpcUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const data: JsonRpcResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data.result as T;
  }

  async getBlockNumber(): Promise<bigint> {
    const result = await this.request<string>('eth_blockNumber');
    return BigInt(result);
  }

  async getBalance(address: string, block: string = 'latest'): Promise<bigint> {
    const result = await this.request<string>('eth_getBalance', [address, block]);
    return BigInt(result);
  }

  async getTransactionCount(address: string, block: string = 'latest'): Promise<bigint> {
    const result = await this.request<string>('eth_getTransactionCount', [address, block]);
    return BigInt(result);
  }

  async call(tx: TransactionRequest, block: string = 'latest'): Promise<string> {
    return this.request<string>('eth_call', [tx, block]);
  }

  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    const result = await this.request<string>('eth_estimateGas', [tx]);
    return BigInt(result);
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.request<string>('eth_gasPrice');
    return BigInt(result);
  }

  async sendRawTransaction(signedTx: string): Promise<string> {
    return this.request<string>('eth_sendRawTransaction', [signedTx]);
  }

  async getTransactionByHash(hash: string): Promise<unknown> {
    return this.request('eth_getTransactionByHash', [hash]);
  }

  async getTransactionReceipt(hash: string): Promise<unknown> {
    return this.request('eth_getTransactionReceipt', [hash]);
  }

  async getBlockByNumber(block: string | number, fullTx: boolean = false): Promise<unknown> {
    const blockParam = typeof block === 'number' ? `0x${block.toString(16)}` : block;
    return this.request('eth_getBlockByNumber', [blockParam, fullTx]);
  }

  async getChainId(): Promise<bigint> {
    const result = await this.request<string>('eth_chainId');
    return BigInt(result);
  }

  setChain(chain: string): void {
    this.chain = chain;
  }

  toProvider(): EIP1193Provider {
    return {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        return this.request(method, params || []);
      }
    };
  }
}

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export function createProvider(options: SatelinkRPCOptions = {}): EIP1193Provider {
  const rpc = new SatelinkRPC(options);
  return rpc.toProvider();
}
