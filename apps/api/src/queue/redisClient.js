import Redis from 'ioredis';
import { logger } from '../monitoring/logger.js';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT) || 6379;

/**
 * Shared Redis connection optimized for BullMQ
 */
const connection = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
});

connection.on('error', (err) => {
    // Log as warning to avoid noise during temporary downtime
    logger.warn({ err: err.message }, '[Redis] Connection Error - Retrying...');
});

connection.on('ready', () => {
    logger.info(`[Redis] Connected to ${redisHost}:${redisPort}`);
});

export { connection };
