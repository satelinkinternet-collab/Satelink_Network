/**
 * In-Memory LRU Response Cache for RPC Gateway
 * S1-RPC-004: Response caching with TTL per method type
 *
 * Cache rules:
 * - Read-heavy methods: cached with appropriate TTL
 * - Write operations: NEVER cached
 * - Max 10,000 entries, evicts oldest 20% when full
 * - No Redis dependency (0 commands/call)
 *
 * Trade-off: Cache not shared across servers (acceptable for single-server
 * or when upstream RPC costs are low relative to cache miss penalty)
 */

import crypto from 'crypto';
import { CHAIN_ALIASES } from './providers.js';

const METHOD_TTL = {
  'eth_blockNumber': 5,
  'eth_chainId': 3600,
  'eth_gasPrice': 5,
  'eth_getBalance': 10,
  'eth_call': 3,
  'eth_getCode': 300,
  'eth_getLogs': 30,
  'eth_getBlockByNumber': 60,
  'eth_getBlockByHash': 3600,
  'eth_getTransactionByHash': 3600,
  'eth_getTransactionReceipt': 3600,
  'net_version': 3600,
  'web3_clientVersion': 3600
};

const NEVER_CACHE = new Set([
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_estimateGas',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_accounts',
  'eth_requestAccounts'
]);

// LRU Cache configuration
const MAX_ENTRIES = 10_000;
const EVICT_PERCENT = 0.20; // Evict 20% when full
const EVICT_COUNT = Math.floor(MAX_ENTRIES * EVICT_PERCENT);

// In-memory cache storage
// Using Map which maintains insertion order (oldest first)
// Entry: { value: any, expiresAt: number }
const cache = new Map();

let cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0
};

function hashParams(params) {
  if (!params || params.length === 0) {
    return 'empty';
  }
  const str = JSON.stringify(params);
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

function getCacheKey(chain, method, params) {
  const normalized = CHAIN_ALIASES[chain] || chain;
  const paramHash = hashParams(params);
  return `${normalized}:${method}:${paramHash}`;
}

/**
 * Evict oldest entries when cache is full.
 * Removes oldest 20% (2,000 entries) to avoid frequent evictions.
 */
function evictOldest() {
  if (cache.size <= MAX_ENTRIES) return;

  const toEvict = EVICT_COUNT;
  let evicted = 0;

  // Map iterates in insertion order, so first entries are oldest
  for (const key of cache.keys()) {
    if (evicted >= toEvict) break;
    cache.delete(key);
    evicted++;
  }

  cacheStats.evictions += evicted;
  console.log(`[RPC Cache] Evicted ${evicted} oldest entries (size: ${cache.size})`);
}

export function isCacheable(method) {
  if (NEVER_CACHE.has(method)) {
    return false;
  }
  return METHOD_TTL[method] !== undefined;
}

export function getTTL(method) {
  return METHOD_TTL[method] || 0;
}

export async function getCached(chain, method, params) {
  if (!isCacheable(method)) {
    return null;
  }

  const key = getCacheKey(chain, method, params);
  const entry = cache.get(key);

  if (!entry) {
    cacheStats.misses++;
    return null;
  }

  // Check if expired
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }

  // Move to end (most recently used) by re-inserting
  cache.delete(key);
  cache.set(key, entry);

  cacheStats.hits++;
  console.log(`[RPC Cache] HIT ${method} (${key.slice(-20)})`);
  return entry.value;
}

export async function setCached(chain, method, params, response) {
  if (!isCacheable(method)) {
    return;
  }

  const ttl = getTTL(method);
  if (ttl <= 0) {
    return;
  }

  // Evict if at capacity
  if (cache.size >= MAX_ENTRIES) {
    evictOldest();
  }

  const key = getCacheKey(chain, method, params);
  const entry = {
    value: response,
    expiresAt: Date.now() + (ttl * 1000)
  };

  // Delete first to update insertion order (move to end)
  cache.delete(key);
  cache.set(key, entry);

  console.log(`[RPC Cache] SET ${method} TTL=${ttl}s (size: ${cache.size})`);
}

export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    total,
    hitRate: total > 0 ? ((cacheStats.hits / total) * 100).toFixed(1) : '0.0',
    size: cache.size,
    maxSize: MAX_ENTRIES,
    evictions: cacheStats.evictions
  };
}

export function resetCacheStats() {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.evictions = 0;
}

// Clear entire cache (for testing/admin)
export function clearCache() {
  cache.clear();
  console.log('[RPC Cache] Cleared');
}

// Get memory usage estimate
export function getMemoryStats() {
  return {
    entries: cache.size,
    maxEntries: MAX_ENTRIES,
    evictThreshold: EVICT_COUNT
  };
}

export { METHOD_TTL, NEVER_CACHE };
