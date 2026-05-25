/**
 * RPC Billing Helper
 * Records revenue to Redis counters (primary) + PostgreSQL (premium only)
 *
 * Architecture change (2026-05):
 * - All RPC calls increment Redis epoch counters (fast, no Postgres row per call)
 * - Only premium calls (> $0.001) write to PostgreSQL for audit trail
 * - epoch_scheduler reads Redis counters when closing epochs
 * - Reduces Postgres writes from 474K/day to ~1440/day
 *
 * Resilience: If Redis is unavailable, falls back to direct Postgres INSERT
 * so billing NEVER stops working.
 */

import { getSharedRedis, isRedisHealthy } from './shared_redis.js';
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
const PREMIUM_THRESHOLD_USDT = 0.001; // Only write to Postgres above this amount
const EPOCH_BUCKET_SECONDS = 60; // Aligns with epoch_scheduler interval
const REDIS_TTL_HOURS = 48;

function getRedis() {
  return getSharedRedis();
}

export async function recordRpcRevenue({ pool, chain, method, apiKey, source, requestId }) {
  const costUsdt = CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
  const clientId = apiKey || 'public';
  const now = Math.floor(Date.now() / 1000);
  const epochBucket = Math.floor(now / EPOCH_BUCKET_SECONDS) * EPOCH_BUCKET_SECONDS;
  const today = new Date().toISOString().split('T')[0];

  const redis = getRedis();
  let redisSuccess = false;

  // 0. Redis-based dedup — skip if already billed this requestId
  if (redis && isRedisHealthy() && requestId) {
    const dedupKey = `billing:dedup:${requestId}`;
    try {
      const alreadyBilled = await redis.get(dedupKey);
      if (alreadyBilled) {
        return;
      }
      await redis.set(dedupKey, '1', 'EX', 60);
    } catch (err) {
      // Continue even if dedup check fails
    }
  }

  // 1. PRIMARY PATH: Increment Redis epoch counters
  // Keys: satelink:billing:epoch:{bucket} and satelink:billing:epoch:{bucket}:client:{clientId}
  if (redis && isRedisHealthy()) {
    try {
      const epochKey = `satelink:billing:epoch:${epochBucket}`;
      const clientKey = `${epochKey}:client:${clientId}`;
      const ttlSeconds = REDIS_TTL_HOURS * 60 * 60;

      await Promise.all([
        // Epoch-level counters
        redis.hincrby(epochKey, 'calls', 1),
        redis.hincrbyfloat(epochKey, 'revenue', costUsdt),
        // Client-level counters within epoch
        redis.hincrby(clientKey, 'calls', 1),
        redis.hincrbyfloat(clientKey, 'revenue', costUsdt),
        // Set TTL (idempotent — resets on each call, which is fine)
        redis.expire(epochKey, ttlSeconds),
        redis.expire(clientKey, ttlSeconds),
        // Daily counters (backwards compat with dashboards)
        redis.incr(`rpc:requests:${today}`),
        redis.incrbyfloat(`rpc:revenue:${today}`, costUsdt)
      ]);
      redisSuccess = true;
    } catch (err) {
      console.error('[Billing] Redis counter error, falling back to Postgres:', err.message);
      redisSuccess = false;
    }
  }

  // 2. POSTGRES PATH: Write if Redis failed OR if premium call (> $0.001)
  // This ensures billing NEVER stops working even if Redis is completely down
  const shouldWritePostgres = !redisSuccess || costUsdt > PREMIUM_THRESHOLD_USDT;

  if (shouldWritePostgres) {
    if (!pool || !pool.query) {
      console.error('[Billing] CRITICAL: pool is undefined and Redis failed — revenue lost!');
      return;
    }

    try {
      await pool.query(
        `INSERT INTO revenue_events_v2 (op_type, client_id, amount_usdt, status, request_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['rpc_call', clientId, costUsdt, 'completed', requestId || String(Date.now()), now]
      );
      if (!redisSuccess) {
        console.log(`[Billing] ✓ $${costUsdt} (Postgres fallback — Redis unavailable)`);
      } else {
        console.log(`[Billing] ✓ Premium call $${costUsdt} written to Postgres`);
      }
    } catch (err) {
      console.error('[Billing] INSERT failed:', err.message);
    }
  }

  // 3. Real-time broadcast (always, for live dashboards)
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
