/**
 * RPC Billing Helper
 * P0 Fix: Wire billing into every RPC request
 *
 * Records revenue to PostgreSQL + increments Redis counters for metrics
 */

import Redis from 'ioredis';

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

let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url || url === 'redis://') {
    return null;
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      tls: url.startsWith('rediss://') ? {} : undefined
    });
    redisClient.on('error', (err) => console.error('[RPC Billing] Redis error:', err.message));
    return redisClient;
  } catch (err) {
    console.error('[RPC Billing] Redis init failed:', err.message);
    return null;
  }
}

export async function recordRpcRevenue({ pool, chain, method, apiKey, source, requestId }) {
  const costUsdt = CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
  const clientId = apiKey || 'public';
  const now = Math.floor(Date.now() / 1000);
  const today = new Date().toISOString().split('T')[0];

  // Always increment Redis counters (even if db fails)
  const redis = getRedis();
  if (redis) {
    try {
      await Promise.all([
        redis.incr(`rpc:requests:${today}`),
        redis.incrbyfloat(`rpc:revenue:${today}`, costUsdt),
        redis.incr('rpc:requests:today'),
        redis.incrbyfloat('rpc:revenue:today', costUsdt)
      ]);
    } catch (err) {
      console.error('[RPC Billing] Redis increment failed:', err.message);
    }
  }

  // Record to PostgreSQL
  if (!pool) {
    console.error('[RPC Billing] CRITICAL: pool is undefined — billing not recording to database!');
    return;
  }

  if (!pool.query) {
    console.error('[RPC Billing] CRITICAL: pool.query is undefined — wrong db object type!');
    return;
  }

  try {
    await pool.query(
      `INSERT INTO revenue_events_v2
       (op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
       VALUES ('rpc_call', $1, $2, $3, 'success', $4, $5)`,
      [source, clientId, costUsdt, requestId, now]
    );
    console.log(`[RPC Billing] ✓ ${method} on ${chain} = $${costUsdt} USDT (${source})`);
  } catch (err) {
    console.error('[RPC Billing] DB insert failed:', err.message);
    // Check for specific errors
    if (err.message.includes('does not exist')) {
      console.error('[RPC Billing] Table revenue_events_v2 may not exist — run migrations!');
    }
    if (err.message.includes('duplicate key')) {
      console.error('[RPC Billing] Duplicate request_id — this call was already billed');
    }
  }
}

export function getDefaultCost(chain) {
  return CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
}
