/**
 * Latency-Based RPC Router
 * S1-RPC-002: Latency-based provider routing with Redis EMA tracking
 * S1-RPC-003: 3-state circuit breaker with Redis persistence
 * S1-RPC-005: Weighted load balancing across providers
 */

import { getProviders, getChainConfig, CHAIN_ALIASES } from './providers.js';
import { isOpen, recordSuccess, recordFailure, getCircuitStats } from './circuit_breaker.js';
import { selectWeightedProvider, incrementRequestCount, getRequestCounts, getWeightsForProviders } from './load_balancer.js';
import Redis from 'ioredis';

const EMA_ALPHA = 0.2;
const REQUEST_TIMEOUT_MS = 10000;

let redisClient = null;

async function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url || url === 'redis://') {
    return null;
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      tls: url.startsWith('rediss://') ? {} : undefined
    });

    redisClient.on('error', (err) => {
      console.error('[RPC Router] Redis error:', err.message);
    });

    return redisClient;
  } catch (err) {
    console.error('[RPC Router] Redis connect failed:', err.message);
    return null;
  }
}

function getLatencyKey(chain, providerId) {
  const normalized = CHAIN_ALIASES[chain] || chain;
  return `rpc:latency:${normalized}:${providerId}`;
}

async function getProviderLatencies(chain, providers) {
  const redis = await getRedis();
  if (!redis) {
    return providers.map(p => ({ ...p, latency: null }));
  }

  const keys = providers.map(p => getLatencyKey(chain, p.id));

  try {
    const values = await redis.mget(...keys);
    return providers.map((p, i) => ({
      ...p,
      latency: values[i] ? parseFloat(values[i]) : null
    }));
  } catch (err) {
    console.error('[RPC Router] Failed to get latencies:', err.message);
    return providers.map(p => ({ ...p, latency: null }));
  }
}

async function updateLatency(chain, providerId, newLatency) {
  const redis = await getRedis();
  if (!redis) return;

  const key = getLatencyKey(chain, providerId);

  try {
    const oldValue = await redis.get(key);
    let ema;

    if (oldValue) {
      const oldLatency = parseFloat(oldValue);
      ema = EMA_ALPHA * newLatency + (1 - EMA_ALPHA) * oldLatency;
    } else {
      ema = newLatency;
    }

    await redis.set(key, ema.toFixed(2), 'EX', 3600);
  } catch (err) {
    console.error('[RPC Router] Failed to update latency:', err.message);
  }
}

function sortProvidersByLatency(providersWithLatency) {
  return [...providersWithLatency].sort((a, b) => {
    if (a.latency === null && b.latency === null) {
      return a.priority - b.priority;
    }
    if (a.latency === null) return 1;
    if (b.latency === null) return -1;
    return a.latency - b.latency;
  });
}

async function executeRpcCall(providerUrl, method, params, id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const startTime = Date.now();

  try {
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: params || [],
        id: id || 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || 'RPC error');
    }

    return { success: true, result, latency };
  } catch (err) {
    clearTimeout(timeout);
    const latency = Date.now() - startTime;
    return { success: false, error: err.message, latency };
  }
}

export async function routeRpcRequest(chain, method, params, id) {
  const chainConfig = getChainConfig(chain);
  if (!chainConfig) {
    return { success: false, error: `Unsupported chain: ${chain}` };
  }

  const providers = getProviders(chain);
  if (providers.length === 0) {
    return { success: false, error: `No providers for chain: ${chain}` };
  }

  const providersWithLatency = await getProviderLatencies(chain, providers);

  const availableProviders = [];
  for (const p of providersWithLatency) {
    const circuitOpen = await isOpen(chain, p.id);
    if (!circuitOpen) {
      availableProviders.push(p);
    }
  }

  if (availableProviders.length === 0) {
    console.warn('[RPC Router] All providers circuit-broken, trying first anyway');
    availableProviders.push(providersWithLatency[0]);
  }

  const attemptedProviders = [];
  let remainingProviders = [...availableProviders];

  while (remainingProviders.length > 0) {
    const provider = selectWeightedProvider(remainingProviders);
    attemptedProviders.push(provider.id);

    const { success, result, error, latency } = await executeRpcCall(
      provider.url,
      method,
      params,
      id
    );

    if (success) {
      await recordSuccess(chain, provider.id);
      await updateLatency(chain, provider.id, latency);
      await incrementRequestCount(chain, provider.id);

      console.log(`[RPC Router] ${chain} → ${provider.id} (${latency}ms) [weighted]`);

      return {
        success: true,
        result,
        provider: provider.id,
        latency
      };
    }

    console.warn(`[RPC Router] ${provider.id} failed: ${error} (${latency}ms)`);
    await recordFailure(chain, provider.id);

    remainingProviders = remainingProviders.filter(p => p.id !== provider.id);
  }

  return {
    success: false,
    error: 'All providers failed',
    attemptedProviders
  };
}

export async function getRouterStats(chain) {
  const providers = getProviders(chain);
  const providersWithLatency = await getProviderLatencies(chain, providers);
  const weights = getWeightsForProviders(providersWithLatency);
  const requestCounts = await getRequestCounts(chain, providers.map(p => p.id));

  const stats = [];
  for (let i = 0; i < providersWithLatency.length; i++) {
    const p = providersWithLatency[i];
    const circuit = await getCircuitStats(chain, p.id);
    const weightInfo = weights.find(w => w.id === p.id);

    stats.push({
      id: p.id,
      type: p.type,
      latency: p.latency,
      weight: weightInfo?.weight || 0,
      requests: requestCounts[i],
      circuit: {
        state: circuit.state,
        failures: circuit.failures,
        timeUntilReset: circuit.timeUntilReset
      }
    });
  }

  return stats;
}

export { getRedis };
