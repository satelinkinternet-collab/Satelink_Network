/**
 * RPC Billing Helper
 * Records revenue to PostgreSQL + Redis counters
 *
 * Schema (from docker/init/init.sql):
 *   revenue_events_v2(id, epoch_id, op_type, node_id, client_id,
 *                     amount_usdt, status, request_id, created_at, ...)
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
    redisClient.on('error', (err) => console.error('[Billing] Redis error:', err.message));
    return redisClient;
  } catch (err) {
    console.error('[Billing] Redis init failed:', err.message);
    return null;
  }
}

export async function recordRpcRevenue({ pool, chain, method, apiKey, source, requestId }) {
  const costUsdt = CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
  const clientId = apiKey || 'public';
  const now = Math.floor(Date.now() / 1000);
  const today = new Date().toISOString().split('T')[0];

  // 1. Increment Redis counters (for real-time metrics)
  const redis = getRedis();
  if (redis) {
    try {
      await Promise.all([
        redis.incr(`rpc:requests:${today}`),
        redis.incrbyfloat(`rpc:revenue:${today}`, costUsdt)
      ]);
    } catch (err) {
      console.error('[Billing] Redis error:', err.message);
    }
  }

  // 2. Insert into PostgreSQL
  if (!pool || !pool.query) {
    console.error('[Billing] CRITICAL: pool is undefined!');
    return;
  }

  try {
    // Schema from server.js ensureBillingTables():
    // op_type, node_id, client_id, amount_usdt, status, request_id, created_at, chain, method, source
    await pool.query(
      `INSERT INTO revenue_events_v2
       (op_type, node_id, client_id, amount_usdt, status, request_id, created_at, chain, method, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      ['rpc_call', source, clientId, costUsdt, 'success', requestId, now, chain, method, source]
    );
    console.log(`[Billing] ✓ ${method} $${costUsdt}`);
  } catch (err) {
    console.error('[Billing] INSERT failed:', err.message);
  }
}

export function getDefaultCost(chain) {
  return CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
}
