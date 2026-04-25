/**
 * Multi-Provider RPC Pool Configuration
 * S1-RPC-001: Multi-provider pool — Polygon Amoy + mainnet + Ethereum
 *
 * Goal: 5,000 RPC requests/second via provider pooling
 * - Multiple providers per chain for redundancy
 * - Latency metrics tracked per provider
 * - Circuit breaker state per provider
 */

const PROVIDER_CONFIGS = {
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    providers: [
      {
        id: 'polygon-amoy-official',
        url: process.env.RPC_POLYGON_AMOY_1 || 'https://rpc-amoy.polygon.technology',
        priority: 1,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'alchemy-amoy',
        url: process.env.ALCHEMY_AMOY_URL || `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'demo'}`,
        priority: 2,
        rateLimit: 300,
        type: 'alchemy'
      },
      {
        id: 'ankr-amoy',
        url: process.env.ANKR_AMOY_URL || 'https://rpc.ankr.com/polygon_amoy',
        priority: 3,
        rateLimit: 100,
        type: 'ankr'
      },
      {
        id: 'drpc-amoy',
        url: process.env.DRPC_AMOY_URL || 'https://polygon-amoy.drpc.org',
        priority: 4,
        rateLimit: 100,
        type: 'drpc'
      }
    ]
  },

  'polygon': {
    chainId: 137,
    name: 'Polygon PoS Mainnet',
    providers: [
      {
        id: 'polygon-official',
        url: process.env.RPC_POLYGON_1 || 'https://polygon-rpc.com',
        priority: 1,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'alchemy-polygon',
        url: process.env.ALCHEMY_POLYGON_URL || `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'demo'}`,
        priority: 2,
        rateLimit: 300,
        type: 'alchemy'
      },
      {
        id: 'ankr-polygon',
        url: process.env.ANKR_POLYGON_URL || 'https://rpc.ankr.com/polygon',
        priority: 3,
        rateLimit: 100,
        type: 'ankr'
      },
      {
        id: 'llamarpc-polygon',
        url: 'https://polygon.llamarpc.com',
        priority: 4,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'drpc-polygon',
        url: process.env.DRPC_POLYGON_URL || 'https://polygon.drpc.org',
        priority: 5,
        rateLimit: 100,
        type: 'drpc'
      }
    ]
  },

  'ethereum': {
    chainId: 1,
    name: 'Ethereum Mainnet',
    providers: [
      {
        id: 'llamarpc-eth',
        url: 'https://eth.llamarpc.com',
        priority: 1,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'alchemy-eth',
        url: process.env.ALCHEMY_ETH_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'demo'}`,
        priority: 2,
        rateLimit: 300,
        type: 'alchemy'
      },
      {
        id: 'ankr-eth',
        url: process.env.ANKR_ETH_URL || 'https://rpc.ankr.com/eth',
        priority: 3,
        rateLimit: 100,
        type: 'ankr'
      },
      {
        id: 'cloudflare-eth',
        url: 'https://cloudflare-eth.com',
        priority: 4,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'drpc-eth',
        url: process.env.DRPC_ETH_URL || 'https://eth.drpc.org',
        priority: 5,
        rateLimit: 100,
        type: 'drpc'
      }
    ]
  },

  'arbitrum': {
    chainId: 42161,
    name: 'Arbitrum One',
    providers: [
      {
        id: 'arbitrum-official',
        url: 'https://arb1.arbitrum.io/rpc',
        priority: 1,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'ankr-arbitrum',
        url: 'https://rpc.ankr.com/arbitrum',
        priority: 2,
        rateLimit: 100,
        type: 'ankr'
      }
    ]
  },

  'base': {
    chainId: 8453,
    name: 'Base Mainnet',
    providers: [
      {
        id: 'base-official',
        url: 'https://mainnet.base.org',
        priority: 1,
        rateLimit: 100,
        type: 'public'
      },
      {
        id: 'ankr-base',
        url: 'https://rpc.ankr.com/base',
        priority: 2,
        rateLimit: 100,
        type: 'ankr'
      }
    ]
  }
};

const CHAIN_ALIASES = {
  'amoy': 'polygon-amoy',
  'matic': 'polygon',
  'eth': 'ethereum',
  'arb': 'arbitrum',
  'base-mainnet': 'base'
};

export function getChainConfig(chainKey) {
  const normalized = CHAIN_ALIASES[chainKey] || chainKey;
  return PROVIDER_CONFIGS[normalized] || null;
}

export function getProviders(chainKey) {
  const config = getChainConfig(chainKey);
  return config ? config.providers : [];
}

export function getPrimaryProvider(chainKey) {
  const providers = getProviders(chainKey);
  return providers.length > 0 ? providers[0] : null;
}

export function getSupportedChains() {
  return Object.keys(PROVIDER_CONFIGS);
}

export function getChainId(chainKey) {
  const config = getChainConfig(chainKey);
  return config ? config.chainId : null;
}

export { PROVIDER_CONFIGS, CHAIN_ALIASES };
