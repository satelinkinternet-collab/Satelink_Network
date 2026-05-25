/**
 * RPC Billing Helper
 * Records revenue to Redis counters (primary) + PostgreSQL (premium only)
 *
 * Architecture (2026-05):
 * - All RPC calls increment Redis epoch counters via Lua script (1 command)
 * - Dedup check uses SET NX (1 command)
 * - Total: 2 Redis commands per call (down from 10)
 * - Only premium calls (> $0.001) write to PostgreSQL for audit trail
 * - epoch_scheduler reads Redis counters when closing epochs
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
const PREMIUM_THRESHOLD_USDT = 0.001;
const EPOCH_BUCKET_SECONDS = 60;
const REDIS_TTL_SECONDS = 48 * 60 * 60; // 48 hours

/**
 * Lua script to increment all billing counters in a single command.
 * This reduces 8 Redis commands to 1.
 *
 * KEYS[1] = epochKey (e.g., satelink:billing:epoch:1234567890)
 * KEYS[2] = clientKey (e.g., satelink:billing:epoch:1234567890:client:public)
 * KEYS[3] = dailyRequestsKey (e.g., rpc:requests:2026-05-25)
 * KEYS[4] = dailyRevenueKey (e.g., rpc:revenue:2026-05-25)
 * ARGV[1] = costUsdt (as string)
 * ARGV[2] = ttlSeconds
 */
const BILLING_LUA_SCRIPT = `
redis.call('HINCRBY', KEYS[1], 'calls', 1)
redis.call('HINCRBYFLOAT', KEYS[1], 'revenue', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
redis.call('HINCRBY', KEYS[2], 'calls', 1)
redis.call('HINCRBYFLOAT', KEYS[2], 'revenue', ARGV[1])
redis.call('EXPIRE', KEYS[2], ARGV[2])
redis.call('INCR', KEYS[3])
redis.call('INCRBYFLOAT', KEYS[4], ARGV[1])
return 1
`;

// Cache the script SHA for EVALSHA (faster than EVAL)
let billingScriptSha = null;

async function runBillingScript(redis, epochKey, clientKey, dailyRequestsKey, dailyRevenueKey, costUsdt, ttlSeconds) {
  const keys = [epochKey, clientKey, dailyRequestsKey, dailyRevenueKey];
  const args = [costUsdt.toString(), ttlSeconds.toString()];

  try {
    // Try EVALSHA first (cached script)
    if (billingScriptSha) {
      try {
        return await redis.evalsha(billingScriptSha, keys.length, ...keys, ...args);
      } catch (err) {
        if (!err.message.includes('NOSCRIPT')) {
          throw err;
        }
        // Script not cached, fall through to EVAL
        billingScriptSha = null;
      }
    }

    // Load and run script, cache SHA for future calls
    const result = await redis.eval(BILLING_LUA_SCRIPT, keys.length, ...keys, ...args);

    // Cache the SHA for next time
    try {
      const sha = await redis.script('LOAD', BILLING_LUA_SCRIPT);
      billingScriptSha = sha;
    } catch (_) {
      // Ignore caching errors
    }

    return result;
  } catch (err) {
    throw err;
  }
}

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

  // 1. DEDUP CHECK: Single SET NX command (1 Redis command)
  // Returns 'OK' if set, null if already exists
  if (redis && isRedisHealthy() && requestId) {
    try {
      const dedupKey = `billing:dedup:${requestId}`;
      const wasSet = await redis.set(dedupKey, '1', 'EX', 60, 'NX');
      if (!wasSet) {
        return; // Already billed this requestId
      }
    } catch (err) {
      // Continue even if dedup check fails
    }
  }

  // 2. EPOCH COUNTERS: Single Lua script (1 Redis command)
  // Replaces 8 separate commands with 1 EVAL
  if (redis && isRedisHealthy()) {
    try {
      const epochKey = `satelink:billing:epoch:${epochBucket}`;
      const clientKey = `${epochKey}:client:${clientId}`;
      const dailyRequestsKey = `rpc:requests:${today}`;
      const dailyRevenueKey = `rpc:revenue:${today}`;

      await runBillingScript(
        redis,
        epochKey,
        clientKey,
        dailyRequestsKey,
        dailyRevenueKey,
        costUsdt,
        REDIS_TTL_SECONDS
      );
      redisSuccess = true;
    } catch (err) {
      console.error('[Billing] Redis Lua script error, falling back to Postgres:', err.message);
      redisSuccess = false;
    }
  }

  // 3. POSTGRES FALLBACK: Write if Redis failed OR if premium call
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

  // 4. Real-time broadcast (always, for live dashboards)
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
