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
    // First check what columns exist on Railway
    const schema = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='revenue_events_v2' ORDER BY ordinal_position"
    );
    const colNames = schema.rows.map(r => r.column_name);
    console.log('[BILLING SCHEMA]', colNames.join(','));

    if (colNames.length === 0) {
      console.error('[BILLING] TABLE revenue_events_v2 DOES NOT EXIST! Run migration first.');
      return;
    }

    // Build INSERT based on available columns
    const insertCols = [];
    const insertVals = [];

    if (colNames.includes('amount_usdt')) {
      insertCols.push('amount_usdt');
      insertVals.push(costUsdt);
    }
    if (colNames.includes('chain')) {
      insertCols.push('chain');
      insertVals.push(chain);
    }
    if (colNames.includes('method')) {
      insertCols.push('method');
      insertVals.push(method);
    }
    if (colNames.includes('source')) {
      insertCols.push('source');
      insertVals.push(source);
    }
    if (colNames.includes('node_id')) {
      insertCols.push('node_id');
      insertVals.push(source);
    }
    if (colNames.includes('client_id')) {
      insertCols.push('client_id');
      insertVals.push(clientId);
    }
    if (colNames.includes('op_type')) {
      insertCols.push('op_type');
      insertVals.push('rpc_call');
    }
    if (colNames.includes('status')) {
      insertCols.push('status');
      insertVals.push('success');
    }
    if (colNames.includes('request_id')) {
      insertCols.push('request_id');
      insertVals.push(requestId);
    }
    if (colNames.includes('created_at')) {
      insertCols.push('created_at');
      insertVals.push(now);
    }

    if (insertCols.length === 0) {
      console.error('[BILLING] No matching columns found in revenue_events_v2!');
      return;
    }

    const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO revenue_events_v2 (${insertCols.join(', ')}) VALUES (${placeholders})`;
    console.log('[BILLING] SQL:', sql);

    await pool.query(sql, insertVals);
    console.log(`[BILLING] ✓ Inserted revenue event: $${costUsdt} USDT`);
  } catch (err) {
    console.error('[BILLING FAILED]', err.message, err.stack?.split('\n')[1]);
    console.error('[BILLING FAILED] Query params:', { source, clientId, costUsdt, requestId, now });
  }
}

export function getDefaultCost(chain) {
  return CHAIN_PRICING_USDT[chain] || DEFAULT_RPC_COST_USDT;
}
