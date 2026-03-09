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
    logger.error({ err: err.message }, '[Redis] Connection Error');
});

connection.on('ready', () => {
    logger.info(`[Redis] Connected to ${redisHost}:${redisPort}`);
});

export { connection };
