/**
 * Shared Redis Client for RPC Gateway
 * DEPRECATED: Redis eliminated — all caching is in-memory (Maps)
 *
 * This module now returns null for all operations.
 * Kept for backward compatibility with any code that still imports it.
 */

const OPERATION_TIMEOUT_MS = 500;

// Always return null — Redis is disabled
export function getSharedRedis() {
  return null;
}

export function getRedisStatus() {
  return { status: 'disabled', reconnectAttempts: 0, reason: 'Redis eliminated - using in-memory' };
}

export function isRedisHealthy() {
  return false;
}

export async function withTimeout(promise, timeoutMs = OPERATION_TIMEOUT_MS, fallback = null) {
  return fallback;
}

export async function safeGet(key, fallback = null) {
  return fallback;
}

export async function safeSet(key, value, ttl = 3600) {
  return false;
}

export async function safeIncr(key) {
  return 0;
}

export async function safeMget(...keys) {
  return keys.map(() => null);
}

export { OPERATION_TIMEOUT_MS };
