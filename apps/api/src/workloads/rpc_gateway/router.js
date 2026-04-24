/**
 * Latency-Based RPC Router
 * S1-RPC-002: Latency-based provider routing with Redis EMA tracking
 *
 * - Picks fastest provider based on tracked latency
 * - Uses EMA (Exponential Moving Average) for smooth latency tracking
 * - Falls back to next provider on failure (circuit breaker)
 * - Cold start: uses priority order from providers.js
 */

import { getProviders, getChainConfig, CHAIN_ALIASES } from './providers.js';
import { createClient } from 'redis';

const EMA_ALPHA = 0.2;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 30000;
const REQUEST_TIMEOUT_MS = 10000;

let redisClient = null;
const circuitBreakers = new Map();

async function getRedis() {
  if (redisClient && redisClient.isOpen) return redisClient;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({ url });

  redisClient.on('error', (err) => {
    console.error('[RPC Router] Redis error:', err.message);
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[RPC Router] Redis connect failed:', err.message);
    return null;
  }

  return redisClient;
}

function getLatencyKey(chain, providerId) {
  const normalized = CHAIN_ALIASES[chain] || chain;
  return `rpc:latency:${normalized}:${providerId}`;
}

function getCircuitKey(providerId) {
  return `circuit:${providerId}`;
}

function isCircuitOpen(providerId) {
  const state = circuitBreakers.get(providerId);
  if (!state) return false;

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
      circuitBreakers.delete(providerId);
      return false;
    }
    return true;
  }
  return false;
}

function recordFailure(providerId) {
  const state = circuitBreakers.get(providerId) || { failures: 0, lastFailure: 0 };
  state.failures++;
  state.lastFailure = Date.now();
  circuitBreakers.set(providerId, state);
}

function recordSuccess(providerId) {
  circuitBreakers.delete(providerId);
}

async function getProviderLatencies(chain, providers) {
  const redis = await getRedis();
  if (!redis) {
    return providers.map(p => ({ ...p, latency: null }));
  }

  const keys = providers.map(p => getLatencyKey(chain, p.id));

  try {
    const values = await redis.mGet(keys);
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

    await redis.set(key, ema.toFixed(2), { EX: 3600 });
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
  const sortedProviders = sortProvidersByLatency(providersWithLatency);

  const availableProviders = sortedProviders.filter(p => !isCircuitOpen(p.id));

  if (availableProviders.length === 0) {
    console.warn('[RPC Router] All providers circuit-broken, trying first anyway');
    availableProviders.push(sortedProviders[0]);
  }

  for (const provider of availableProviders) {
    const { success, result, error, latency } = await executeRpcCall(
      provider.url,
      method,
      params,
      id
    );

    if (success) {
      recordSuccess(provider.id);
      await updateLatency(chain, provider.id, latency);

      console.log(`[RPC Router] ${chain} → ${provider.id} (${latency}ms)`);

      return {
        success: true,
        result,
        provider: provider.id,
        latency
      };
    }

    console.warn(`[RPC Router] ${provider.id} failed: ${error} (${latency}ms)`);
    recordFailure(provider.id);
  }

  return {
    success: false,
    error: 'All providers failed',
    attemptedProviders: availableProviders.map(p => p.id)
  };
}

export async function getRouterStats(chain) {
  const providers = getProviders(chain);
  const providersWithLatency = await getProviderLatencies(chain, providers);

  return providersWithLatency.map(p => ({
    id: p.id,
    type: p.type,
    latency: p.latency,
    circuitOpen: isCircuitOpen(p.id)
  }));
}

export { getRedis };
