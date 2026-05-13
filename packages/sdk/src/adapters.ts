/**
 * Framework Adapters
 * L8-002: Drop-in adapters for ethers.js, wagmi, and viem
 *
 * Makes Satelink RPC a drop-in replacement for Alchemy/Infura
 */

const BASE_URL = 'https://rpc.satelink.network';

export const SATELINK_CHAINS = {
  polygon: { chainId: 137, name: 'Polygon', rpcUrl: `${BASE_URL}/rpc/polygon` },
  ethereum: { chainId: 1, name: 'Ethereum', rpcUrl: `${BASE_URL}/rpc/ethereum` },
  arbitrum: { chainId: 42161, name: 'Arbitrum One', rpcUrl: `${BASE_URL}/rpc/arbitrum` },
  base: { chainId: 8453, name: 'Base', rpcUrl: `${BASE_URL}/rpc/base` },
  amoy: { chainId: 80002, name: 'Polygon Amoy', rpcUrl: `${BASE_URL}/rpc/amoy` }
} as const;

export type SatelinkChain = keyof typeof SATELINK_CHAINS;

/**
 * Get the RPC URL for a chain
 */
export function getSatelinkRpcUrl(chain: SatelinkChain = 'polygon', apiKey?: string): string {
  const config = SATELINK_CHAINS[chain];
  return apiKey ? `${config.rpcUrl}?apiKey=${apiKey}` : config.rpcUrl;
}

/**
 * Create an ethers.js v6 JsonRpcProvider for Satelink
 *
 * @example
 * ```ts
 * import { getEthersProvider } from '@satelink/sdk';
 * const provider = getEthersProvider('polygon');
 * const block = await provider.getBlockNumber();
 * ```
 */
export function getEthersProvider(
  chain: SatelinkChain = 'polygon',
  apiKey?: string
): unknown {
  const config = SATELINK_CHAINS[chain];
  const url = config.rpcUrl;

  try {
    // Try ethers v6 first
    const { JsonRpcProvider } = require('ethers');
    const fetchRequest = apiKey ? {
      url,
      getUrlFunc: () => url,
      processFunc: (req: unknown, resp: unknown) => resp,
      setHeader: (key: string, value: string) => {},
    } : undefined;

    return new JsonRpcProvider(url, config.chainId, {
      staticNetwork: true
    });
  } catch {
    try {
      // Fall back to ethers v5
      const { providers } = require('ethers');
      const connection = apiKey
        ? { url, headers: { 'X-API-Key': apiKey } }
        : url;
      return new providers.JsonRpcProvider(connection, config.chainId);
    } catch {
      throw new Error(
        '@satelink/sdk ethers adapter requires ethers ^5.0.0 or ^6.0.0. ' +
        'Install with: npm install ethers'
      );
    }
  }
}

/**
 * Create a viem http transport for Satelink
 *
 * @example
 * ```ts
 * import { createPublicClient } from 'viem';
 * import { polygon } from 'viem/chains';
 * import { getViemTransport } from '@satelink/sdk';
 *
 * const client = createPublicClient({
 *   chain: polygon,
 *   transport: getViemTransport('polygon'),
 * });
 * ```
 */
export function getViemTransport(
  chain: SatelinkChain = 'polygon',
  apiKey?: string
): unknown {
  const config = SATELINK_CHAINS[chain];

  try {
    const { http } = require('viem');
    return http(config.rpcUrl, {
      fetchOptions: apiKey
        ? { headers: { 'X-API-Key': apiKey } }
        : undefined,
      retryCount: 3,
      retryDelay: 150,
      timeout: 20000
    });
  } catch {
    throw new Error(
      '@satelink/sdk viem adapter requires viem ^1.0.0 or ^2.0.0. ' +
      'Install with: npm install viem'
    );
  }
}

/**
 * Get a wagmi-compatible chain config for Satelink RPC
 *
 * @example
 * ```ts
 * import { createConfig, http } from 'wagmi';
 * import { getSatelinkChainConfig } from '@satelink/sdk';
 *
 * const config = createConfig({
 *   chains: [getSatelinkChainConfig('polygon')],
 *   transports: { 137: http('https://rpc.satelink.network/rpc/polygon') }
 * });
 * ```
 */
export function getSatelinkChainConfig(chain: SatelinkChain = 'polygon') {
  const config = SATELINK_CHAINS[chain];

  return {
    id: config.chainId,
    name: config.name,
    nativeCurrency: getNativeCurrency(chain),
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] }
    },
    blockExplorers: getBlockExplorer(chain)
  };
}

function getNativeCurrency(chain: SatelinkChain) {
  switch (chain) {
    case 'polygon':
    case 'amoy':
      return { name: 'MATIC', symbol: 'MATIC', decimals: 18 };
    case 'ethereum':
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
    case 'arbitrum':
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
    case 'base':
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
    default:
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
  }
}

function getBlockExplorer(chain: SatelinkChain) {
  const explorers: Record<SatelinkChain, { default: { name: string; url: string } }> = {
    polygon: { default: { name: 'Polygonscan', url: 'https://polygonscan.com' } },
    ethereum: { default: { name: 'Etherscan', url: 'https://etherscan.io' } },
    arbitrum: { default: { name: 'Arbiscan', url: 'https://arbiscan.io' } },
    base: { default: { name: 'Basescan', url: 'https://basescan.org' } },
    amoy: { default: { name: 'Polygonscan Amoy', url: 'https://amoy.polygonscan.com' } }
  };
  return explorers[chain];
}

/**
 * Raw JSON-RPC call to Satelink (no dependencies)
 *
 * @example
 * ```ts
 * import { rpc } from '@satelink/sdk';
 * const blockNumber = await rpc('eth_blockNumber', [], 'polygon');
 * ```
 */
export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  chain: SatelinkChain = 'polygon',
  apiKey?: string
): Promise<T> {
  const config = SATELINK_CHAINS[chain];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  const response = await fetch(config.rpcUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message} (code: ${data.error.code})`);
  }

  return data.result as T;
}
