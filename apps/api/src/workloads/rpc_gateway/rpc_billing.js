/**
 * RPC Billing Helper
 * Records revenue to in-memory counters, flushed once per epoch close
 *
 * Architecture (2026-05):
 * - All RPC calls accumulate in-memory (0 Redis commands per call)
 * - epoch_scheduler calls getAndClearEpochCounters() when closing epoch
 * - Dedup uses in-memory Set with TTL cleanup
 * - Only premium calls (> $0.001) write to PostgreSQL for audit trail
 *
 * Result: 0 Redis commands per RPC call (down from 10 → 2 → 0)
 */

import { broadcaster } from '../../realtime/broadcaster-instance.js';

const CHAIN_PRICING_USDT = {
  'ethereum': 0.00005,
  'eth': 0.00005,
  'polygon': 0.00003,
  'matic': 0.00003,
  'polygon-amoy': 0.00003,
  'amoy': 0.00003,
  'arbitrum': 0.00004,
  'arb': 0.00004,
  'base': 0.00004
};

const DEFAULT_RPC_COST_USDT = 0.00003;
const PREMIUM_THRESHOLD_USDT = 0.001;
const EPOCH_BUCKET_SECONDS = 60;
const DEDUP_TTL_MS = 60_000; // 60 seconds
const DEDUP_CLEANUP_INTERVAL_MS = 30_000; // Cleanup every 30 seconds

/**
 * In-memory epoch counters
 * Key: epochBucket (timestamp aligned to 60s)
 * Value: { calls, revenue, clients: Map<clientId, { calls, revenue }> }
 */
const epochCounters = new Map();

/**
 * In-memory dedup set
 * Key: requestId
 * Value: expiresAt timestamp
 */
const dedupSet = new Map();

/**
 * Daily counters for metrics endpoint compatibility
 * Key: date string (YYYY-MM-DD)
 * Value: { requests, revenue }
 */
const dailyCounters = new Map();

// Cleanup dedup set periodically
let dedupCleanupHandle = null;

function startDedupCleanup() {
  if (dedupCleanupHandle) return;

  dedupCleanupHandle = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiresAt] of dedupSet) {
      if (expiresAt < now) {
        dedupSet.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Billing] Cleaned ${cleaned} expired dedup entries`);
    }
  }, DEDUP_CLEANUP_INTERVAL_MS);

  dedupCleanupHandle.unref?.();
}

// Start cleanup on module load
startDedupCleanup();

/**
 * Get or create epoch counter bucket
 */
function getEpochBucket(epochBucket) {
  let bucket = epochCounters.get(epochBucket);
  if (!bucket) {
    bucket = {
      calls: 0,
      revenue: 0,
      clients: new Map()
    };
    epochCounters.set(epochBucket, bucket);
  }
  return bucket;
}

/**
 * Get or create daily counter
 */
function getDailyBucket(date) {
  let bucket = dailyCounters.get(date);
  if (!bucket) {
    bucket = { requests: 0, revenue: 0 };
    dailyCounters.set(date, bucket);
  }
  return bucket;
}

/**
 * Called by epoch_scheduler when closing an epoch.
 * Returns accumulated counters and clears them from memory.
 */
export function getAndClearEpochCounters(epochStartsAt) {
  const epochBucket = Math.floor(epochStartsAt / EPOCH_BUCKET_SECONDS) * EPOCH_BUCKET_SECONDS;
  const bucket = epochCounters.get(epochBucket);

  if (!bucket) {
    return { calls: 0, revenue: 0, clients: new Map() };
  }

  // Remove from memory after reading
  epochCounters.delete(epochBucket);

  console.log(`[Billing] Epoch ${epochBucket}: ${bucket.calls} calls, $${bucket.revenue.toFixed(6)} — cleared from memory`);

  return bucket;
}

/**
 * Get daily counters for metrics endpoint
 */
export function getDailyCounters(date) {
  const bucket = dailyCounters.get(date);
  return bucket || { requests: 0, revenue: 0 };
}

/**
 * Clear old daily counters (call periodically)
 */
export function cleanupOldCounters(daysToKeep = 2) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  for (const date of dailyCounters.keys()) {
    if (date < cutoffStr) {
      dailyCounters.delete(date);
    }
  }

  // Also cleanup old epoch buckets (older than 2 hours)
  const epochCutoff = Math.floor(Date.now() / 1000) - (2 * 60 * 60);
  for (const bucket of epochCounters.keys()) {
    if (bucket < epochCutoff) {
      epochCounters.delete(bucket);
    }
  }
}

export async function recordRpcRevenue({ pool, chain, method, apiKey, source, requestId }) {
  const costUsdt = CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
  const clientId = apiKey || 'public';
  const now = Math.floor(Date.now() / 1000);
  const epochBucket = Math.floor(now / EPOCH_BUCKET_SECONDS) * EPOCH_BUCKET_SECONDS;
  const today = new Date().toISOString().split('T')[0];

  // 1. DEDUP CHECK: In-memory (0 Redis commands)
  if (requestId) {
    const existingExpiry = dedupSet.get(requestId);
    if (existingExpiry && existingExpiry > Date.now()) {
      return; // Already billed this requestId
    }
    dedupSet.set(requestId, Date.now() + DEDUP_TTL_MS);
  }

  // 2. ACCUMULATE IN MEMORY: Epoch counters (0 Redis commands)
  const bucket = getEpochBucket(epochBucket);
  bucket.calls++;
  bucket.revenue += costUsdt;

  // Client-level tracking
  let clientBucket = bucket.clients.get(clientId);
  if (!clientBucket) {
    clientBucket = { calls: 0, revenue: 0 };
    bucket.clients.set(clientId, clientBucket);
  }
  clientBucket.calls++;
  clientBucket.revenue += costUsdt;

  // 3. DAILY COUNTERS: For metrics endpoint
  const daily = getDailyBucket(today);
  daily.requests++;
  daily.revenue += costUsdt;

  // 4. POSTGRES: Only for premium calls (> $0.001)
  if (costUsdt > PREMIUM_THRESHOLD_USDT) {
    if (pool && pool.query) {
      try {
        await pool.query(
          `INSERT INTO revenue_events_v2 (op_type, client_id, amount_usdt, status, request_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['rpc_call', clientId, costUsdt, 'completed', requestId || String(Date.now()), now]
        );
        console.log(`[Billing] ✓ Premium call $${costUsdt} written to Postgres`);
      } catch (err) {
        console.error('[Billing] Premium INSERT failed:', err.message);
      }
    }
  }

  // 5. Real-time broadcast (always, for live dashboards)
  broadcaster.publish('revenue:event', {
    amount_usdt: costUsdt,
    method: method || 'rpc_call',
    chain: chain || 'unknown',
    epoch_id: null,
    client_id: clientId,
    timestamp: new Date().toISOString()
  });
}

export function getDefaultCost(chain) {
  return CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
}

// For monitoring/debugging
export function getBillingStats() {
  let totalCalls = 0;
  let totalRevenue = 0;

  for (const bucket of epochCounters.values()) {
    totalCalls += bucket.calls;
    totalRevenue += bucket.revenue;
  }

  return {
    epochBuckets: epochCounters.size,
    dedupEntries: dedupSet.size,
    dailyBuckets: dailyCounters.size,
    pendingCalls: totalCalls,
    pendingRevenue: totalRevenue
  };
}

export function stopDedupCleanup() {
  if (dedupCleanupHandle) {
    clearInterval(dedupCleanupHandle);
    dedupCleanupHandle = null;
  }
}
