/**
 * Shared Redis connection for BullMQ
 * DEPRECATED: Redis eliminated — connection is always null
 *
 * All queue operations now use in-memory alternatives or PostgreSQL.
 * This file returns null for backward compatibility with existing imports.
 */

// Redis eliminated — using in-memory caching instead
const connection = null;

console.log('[Redis] Disabled — all caching/queuing uses in-memory alternatives');

export { connection };
