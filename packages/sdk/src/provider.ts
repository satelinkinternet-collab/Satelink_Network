/**
 * EIP-1193 Compatible Provider
 * S4-003: Standard Ethereum provider interface for Satelink RPC
 */

type RequestArguments = {
  method: string;
  params?: unknown[] | object;
};

type EventHandler = (...args: unknown[]) => void;

export interface EIP1193Provider {
  request(args: RequestArguments): Promise<unknown>;
  on(event: string, handler: EventHandler): void;
  removeListener(event: string, handler: EventHandler): void;
}

export interface SatelinkProviderOptions {
  chainId?: number;
  apiKey?: string;
  baseUrl?: string;
}

const CHAIN_MAP: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  80002: 'polygon-amoy',
  42161: 'arbitrum',
  8453: 'base'
};

export class SatelinkProvider implements EIP1193Provider {
  private _chainId: number;
  private _apiKey: string;
  private _baseUrl: string;
  private _listeners: Map<string, Set<EventHandler>> = new Map();

  constructor(options: SatelinkProviderOptions = {}) {
    this._chainId = options.chainId || 137;
    this._apiKey = options.apiKey || '';
    this._baseUrl = options.baseUrl || 'https://rpc.satelink.network';
  }

  get chainId(): string {
    return `0x${this._chainId.toString(16)}`;
  }

  get connected(): boolean {
    return true;
  }

  async request({ method, params }: RequestArguments): Promise<unknown> {
    if (method === 'eth_chainId') {
      return this.chainId;
    }

    if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
      return [];
    }

    if (method === 'wallet_switchEthereumChain') {
      const chainIdHex = (params as { chainId: string }[])?.[0]?.chainId;
      if (chainIdHex) {
        const newChainId = parseInt(chainIdHex, 16);
        if (CHAIN_MAP[newChainId]) {
          const oldChainId = this._chainId;
          this._chainId = newChainId;
          if (oldChainId !== newChainId) {
            this._emit('chainChanged', this.chainId);
          }
          return null;
        }
        throw { code: 4902, message: 'Chain not supported' };
      }
    }

    const chain = CHAIN_MAP[this._chainId] || 'polygon';
    const url = `${this._baseUrl}/rpc/${chain}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this._apiKey) {
      headers['X-API-Key'] = this._apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || []
      })
    });

    const data = await response.json();

    if (data.error) {
      throw {
        code: data.error.code || -32000,
        message: data.error.message || 'RPC error'
      };
    }

    return data.result;
  }

  on(event: string, handler: EventHandler): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(handler);
  }

  removeListener(event: string, handler: EventHandler): void {
    this._listeners.get(event)?.delete(handler);
  }

  private _emit(event: string, ...args: unknown[]): void {
    this._listeners.get(event)?.forEach(handler => handler(...args));
  }

  disconnect(): void {
    this._emit('disconnect', { code: 1000, message: 'User disconnected' });
    this._listeners.clear();
  }
}

export function createSatelinkProvider(options?: SatelinkProviderOptions): SatelinkProvider {
  return new SatelinkProvider(options);
}
