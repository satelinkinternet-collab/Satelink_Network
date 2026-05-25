/**
 * Shared Redis Client for RPC Gateway
 * Single connection pool with auto-reconnect and operation timeouts
 */

import Redis from 'ioredis';

const OPERATION_TIMEOUT_MS = 500;
const RECONNECT_BASE_MS = 100;
const RECONNECT_MAX_MS = 5000;

let redis = null;
let connectionStatus = 'disconnected';
let reconnectAttempts = 0;

export function getSharedRedis() {
  if (redis && connectionStatus !== 'closed' && connectionStatus !== 'failed') {
    return redis;
  }

  const url = process.env.REDIS_URL;
  if (!url || url === 'redis://') {
    connectionStatus = 'disabled';
    return null;
  }

  // Reset if we're reconnecting after a failure
  if (redis) {
    try {
      redis.disconnect();
    } catch (_) {}
    redis = null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 3000,
      commandTimeout: OPERATION_TIMEOUT_MS,
      retryStrategy: (times) => {
        reconnectAttempts = times;
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms... capped at 5s
        // Never return null — always keep trying to reconnect
        const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, times - 1), RECONNECT_MAX_MS);
        console.log(`[SharedRedis] Reconnect attempt ${times} in ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        // Reconnect on common transient errors
        const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      },
      tls: url.startsWith('rediss://') ? {} : undefined,
      lazyConnect: false,
      enableOfflineQueue: false
    });

    redis.on('connect', () => {
      connectionStatus = 'connected';
      reconnectAttempts = 0;
      console.log('[SharedRedis] Connected');
    });

    redis.on('ready', () => {
      connectionStatus = 'ready';
      reconnectAttempts = 0;
      console.log('[SharedRedis] Ready');
    });

    redis.on('error', (err) => {
      connectionStatus = 'error';
      // Only log once per error burst to avoid spam
      if (reconnectAttempts <= 1) {
        console.error('[SharedRedis] Error:', err.message);
      }
    });

    redis.on('close', () => {
      connectionStatus = 'closed';
      console.warn('[SharedRedis] Connection closed — retryStrategy will handle reconnect');
    });

    redis.on('reconnecting', (delay) => {
      connectionStatus = 'reconnecting';
    });

    return redis;
  } catch (err) {
    console.error('[SharedRedis] Init failed:', err.message);
    connectionStatus = 'failed';
    redis = null;
    return null;
  }
}

export function getRedisStatus() {
  return { status: connectionStatus, reconnectAttempts };
}

export function isRedisHealthy() {
  return connectionStatus === 'ready' || connectionStatus === 'connected';
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
  if (!client || !isRedisHealthy()) return fallback;

  return withTimeout(client.get(key), OPERATION_TIMEOUT_MS, fallback);
}

export async function safeSet(key, value, ttl = 3600) {
  const client = getSharedRedis();
  if (!client || !isRedisHealthy()) return false;

  try {
    await withTimeout(client.set(key, value, 'EX', ttl), OPERATION_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

export async function safeIncr(key) {
  const client = getSharedRedis();
  if (!client || !isRedisHealthy()) return 0;

  return withTimeout(client.incr(key).catch(() => 0), OPERATION_TIMEOUT_MS, 0);
}

export async function safeMget(...keys) {
  const client = getSharedRedis();
  if (!client || !isRedisHealthy()) return keys.map(() => null);

  return withTimeout(client.mget(...keys), OPERATION_TIMEOUT_MS, keys.map(() => null));
}

export { OPERATION_TIMEOUT_MS };
