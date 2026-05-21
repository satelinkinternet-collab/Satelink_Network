/**
 * Shared Redis Client for RPC Gateway
 * Single connection pool with operation timeouts to prevent hanging
 */

import Redis from 'ioredis';

const OPERATION_TIMEOUT_MS = 500;

let redis = null;
let connectionStatus = 'disconnected';

export function getSharedRedis() {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url || url === 'redis://') {
    connectionStatus = 'disabled';
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: OPERATION_TIMEOUT_MS,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      tls: url.startsWith('rediss://') ? {} : undefined,
      lazyConnect: false,
      enableOfflineQueue: false
    });

    redis.on('connect', () => {
      connectionStatus = 'connected';
      console.log('[SharedRedis] Connected');
    });

    redis.on('ready', () => {
      connectionStatus = 'ready';
    });

    redis.on('error', (err) => {
      connectionStatus = 'error';
      console.error('[SharedRedis] Error:', err.message);
    });

    redis.on('close', () => {
      connectionStatus = 'closed';
    });

    return redis;
  } catch (err) {
    console.error('[SharedRedis] Init failed:', err.message);
    connectionStatus = 'failed';
    return null;
  }
}

export function getRedisStatus() {
  return connectionStatus;
}

export async function withTimeout(promise, timeoutMs = OPERATION_TIMEOUT_MS, fallback = null) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Redis timeout')), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.message === 'Redis timeout') {
      console.warn('[SharedRedis] Operation timed out');
    }
    return fallback;
  }
}

export async function safeGet(key, fallback = null) {
  const client = getSharedRedis();
  if (!client) return fallback;

  return withTimeout(client.get(key), OPERATION_TIMEOUT_MS, fallback);
}

export async function safeSet(key, value, ttl = 3600) {
  const client = getSharedRedis();
  if (!client) return false;

  try {
    await withTimeout(client.set(key, value, 'EX', ttl), OPERATION_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

export async function safeIncr(key) {
  const client = getSharedRedis();
  if (!client) return 0;

  return withTimeout(client.incr(key).catch(() => 0), OPERATION_TIMEOUT_MS, 0);
}

export async function safeMget(...keys) {
  const client = getSharedRedis();
  if (!client) return keys.map(() => null);

  return withTimeout(client.mget(...keys), OPERATION_TIMEOUT_MS, keys.map(() => null));
}

export { OPERATION_TIMEOUT_MS };
