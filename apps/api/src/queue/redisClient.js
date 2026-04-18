import Redis from 'ioredis';
import { logger } from '../monitoring/logger.js';

/**
 * Shared Redis connection optimized for BullMQ
 * Supports both REDIS_URL (Upstash/production) and REDIS_HOST/PORT (local dev)
 */
let connection;
let connectionLabel;

if (process.env.REDIS_URL) {
    // Production: Upstash or any Redis provider with URL
    const url = process.env.REDIS_URL;
    // Upstash ALWAYS requires TLS, even if URL says redis:// instead of rediss://
    const isUpstash = url.includes('upstash.io');
    const needsTls = url.startsWith('rediss://') || isUpstash;
    connectionLabel = url.replace(/\/\/.*@/, '//<credentials>@');

    connection = new Redis(url, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        // Upstash requires TLS even on redis:// URLs
        ...(needsTls && { tls: {} }),
    });
} else {
    // Local dev: use REDIS_HOST/PORT with no TLS
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT) || 6379;
    connectionLabel = `${redisHost}:${redisPort}`;

    connection = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
}

// Log which connection mode we're using at startup
const redisUrl = process.env.REDIS_URL || '';
const isTlsMode = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');
console.log(`[Redis] Connecting to ${connectionLabel} (TLS: ${isTlsMode ? 'yes' : 'no'})`);

connection.on('error', (err) => {
    logger.warn({ err: err?.message || String(err), code: err?.code }, '[Redis] Connection Error - Retrying...');
});

connection.on('ready', () => {
    logger.info(`[Redis] Connected to ${connectionLabel}`);
});

export { connection };
