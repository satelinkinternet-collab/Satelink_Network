/**
 * API Key Tiers and Rate Limiting
 * S1-RPC-006: Tiered rate limiting for paid customers
 *
 * Tiers:
 * - free: 100 requests/day (IP-based, no API key)
 * - basic: 10,000 requests/day
 * - pro: 100,000 requests/day
 * - enterprise: 1,000,000 requests/day
 *
 * Storage: In-memory Maps (no Redis dependency)
 * - apiKeys: Map<apiKey, { tier, owner, created, status }>
 * - usageCounts: Map<usageKey, { count, expires }>
 *
 * Trade-off: Rate limits are per-server, not global.
 * At 474K calls/day this saves 5 Redis commands/call = 2.37M commands/day.
 */

import crypto from 'crypto';

const TIERS = {
  free: {
    limit: 200,
    period: 'day',
    priceUsdt: 0
  },
  basic: {
    limit: 10000,
    period: 'day',
    priceUsdt: 10
  },
  pro: {
    limit: 100000,
    period: 'day',
    priceUsdt: 50
  },
  enterprise: {
    limit: 1000000,
    period: 'day',
    priceUsdt: 200
  }
};

// In-memory storage (replaces Redis)
const apiKeys = new Map();
const usageCounts = new Map();

// Cleanup expired entries every 60 seconds
const CLEANUP_INTERVAL_MS = 60_000;
const USAGE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

let cleanupHandle = null;

function startCleanup() {
  if (cleanupHandle) return;

  cleanupHandle = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of usageCounts) {
      if (entry.expires && entry.expires < now) {
        usageCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }, CLEANUP_INTERVAL_MS);

  cleanupHandle.unref?.();
}

// Start cleanup on module load
startCleanup();

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsageKey(apiKey, date) {
  return `usage:${apiKey}:${date}`;
}

function getIpUsageKey(ip, date) {
  return `usage:ip:${ip}:${date}`;
}

export function generateApiKey() {
  return `sk_${crypto.randomBytes(24).toString('hex')}`;
}

export async function createApiKey(tier, owner) {
  if (!TIERS[tier]) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const apiKey = generateApiKey();
  const keyInfo = {
    tier,
    owner: owner || 'anonymous',
    created: Date.now(),
    status: 'active'
  };

  apiKeys.set(apiKey, keyInfo);

  console.log(`[RateLimiter] Created API key: ${apiKey.slice(0, 10)}... tier=${tier}`);

  return { apiKey, ...keyInfo };
}

export async function getApiKeyInfo(apiKey) {
  return apiKeys.get(apiKey) || null;
}

export async function checkRateLimit(apiKey, ip) {
  const date = getDateKey();

  let tier = 'free';
  let usageKey;

  if (apiKey && apiKey.startsWith('sk_')) {
    const keyInfo = apiKeys.get(apiKey);
    if (keyInfo && keyInfo.status === 'active') {
      tier = keyInfo.tier;
      usageKey = getUsageKey(apiKey, date);
    } else {
      usageKey = getIpUsageKey(ip, date);
    }
  } else {
    usageKey = getIpUsageKey(ip, date);
  }

  const limit = TIERS[tier].limit;
  const entry = usageCounts.get(usageKey);
  const current = entry?.count || 0;

  if (current >= limit) {
    return {
      allowed: false,
      tier,
      remaining: 0,
      limit,
      resetAt: getNextResetTime()
    };
  }

  return {
    allowed: true,
    tier,
    remaining: limit - current - 1,
    limit
  };
}

export async function incrementUsage(apiKey, ip) {
  const date = getDateKey();
  let usageKey;

  if (apiKey && apiKey.startsWith('sk_')) {
    const keyInfo = apiKeys.get(apiKey);
    if (keyInfo && keyInfo.status === 'active') {
      usageKey = getUsageKey(apiKey, date);
    } else {
      usageKey = getIpUsageKey(ip, date);
    }
  } else {
    usageKey = getIpUsageKey(ip, date);
  }

  const entry = usageCounts.get(usageKey);
  if (entry) {
    entry.count++;
  } else {
    usageCounts.set(usageKey, {
      count: 1,
      expires: Date.now() + USAGE_TTL_MS
    });
  }
}

export async function getUsageStats(apiKey) {
  const keyInfo = apiKeys.get(apiKey);
  if (!keyInfo) return null;

  const date = getDateKey();
  const usageKey = getUsageKey(apiKey, date);
  const entry = usageCounts.get(usageKey);
  const current = entry?.count || 0;
  const limit = TIERS[keyInfo.tier].limit;

  return {
    tier: keyInfo.tier,
    used: current,
    limit,
    remaining: Math.max(0, limit - current),
    percentUsed: ((current / limit) * 100).toFixed(1),
    resetAt: getNextResetTime()
  };
}

function getNextResetTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export function getTiers() {
  return TIERS;
}

// For testing/admin
export function getMemoryStats() {
  return {
    apiKeys: apiKeys.size,
    usageCounts: usageCounts.size
  };
}

export function stopCleanup() {
  if (cleanupHandle) {
    clearInterval(cleanupHandle);
    cleanupHandle = null;
  }
}

export { TIERS };
