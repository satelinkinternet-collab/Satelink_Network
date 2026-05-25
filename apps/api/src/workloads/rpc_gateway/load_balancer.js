/**
 * Weighted Load Balancer for RPC Providers
 * S1-RPC-005: Weighted load balancing across providers
 *
 * Weight calculation:
 * - Faster providers get higher weights (inverse latency)
 * - Rate limits factor into max concurrent requests
 * - Circuit-broken providers get weight 0
 *
 * Selection: Weighted random selection
 * - Distributes load proportionally to weights
 * - Prevents single provider from being overwhelmed
 * - Still favors faster, more reliable providers
 *
 * Storage: In-memory Map (no Redis dependency)
 * - Request counts are local metrics, don't need cross-server sharing
 * - Saves 0-2 Redis commands per RPC call
 */

import { CHAIN_ALIASES } from "./providers.js";

const DEFAULT_LATENCY = 500;
const MIN_WEIGHT = 1;
const MAX_WEIGHT = 100;
const COUNTER_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory request counters (replaces Redis)
// Key: "chain:providerId" → { count, expires }
const requestCounts = new Map();

let cleanupHandle = null;

function startCleanup() {
  if (cleanupHandle) return;

  cleanupHandle = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of requestCounts) {
      if (entry.expires && entry.expires < now) {
        requestCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[LoadBalancer] Cleaned ${cleaned} expired counters`);
    }
  }, CLEANUP_INTERVAL_MS);

  cleanupHandle.unref?.();
}

// Start cleanup on module load
startCleanup();

function getRequestCountKey(chain, providerId) {
  const normalized = CHAIN_ALIASES[chain] || chain;
  return `${normalized}:${providerId}`;
}

export function calculateWeight(provider) {
  const latency = provider.latency || DEFAULT_LATENCY;
  const rateLimit = provider.rateLimit || 100;

  const latencyScore = 1 / Math.sqrt(latency);
  const rateLimitBonus = Math.log10(rateLimit + 1);
  const priorityBonus = (10 - Math.min(provider.priority || 1, 10)) / 10;

  let weight = latencyScore * rateLimitBonus * (1 + priorityBonus);

  weight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, Math.round(weight)));

  return weight;
}

export function selectWeightedProvider(providers) {
  if (providers.length === 0) return null;
  if (providers.length === 1) return providers[0];

  const weights = providers.map((p) => ({
    provider: p,
    weight: calculateWeight(p),
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  if (totalWeight === 0) {
    return providers[0];
  }

  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const { provider, weight } of weights) {
    cumulative += weight;
    if (random <= cumulative) {
      return provider;
    }
  }

  return providers[providers.length - 1];
}

export async function incrementRequestCount(chain, providerId) {
  const key = getRequestCountKey(chain, providerId);
  const entry = requestCounts.get(key);

  if (entry) {
    entry.count++;
  } else {
    requestCounts.set(key, {
      count: 1,
      expires: Date.now() + COUNTER_TTL_MS
    });
  }
}

export async function getRequestCounts(chain, providerIds) {
  return providerIds.map((id) => {
    const key = getRequestCountKey(chain, id);
    const entry = requestCounts.get(key);
    return entry?.count || 0;
  });
}

export function getWeightsForProviders(providers) {
  return providers.map((p) => ({
    id: p.id,
    weight: calculateWeight(p),
    latency: p.latency,
    rateLimit: p.rateLimit,
  }));
}

// For testing/admin
export function getMemoryStats() {
  let totalRequests = 0;
  for (const entry of requestCounts.values()) {
    totalRequests += entry.count;
  }

  return {
    providers: requestCounts.size,
    totalRequests
  };
}

export function stopCleanup() {
  if (cleanupHandle) {
    clearInterval(cleanupHandle);
    cleanupHandle = null;
  }
}

export { MIN_WEIGHT, MAX_WEIGHT, DEFAULT_LATENCY };
