import { JobQueue } from './job_queue.js';
import { logger } from '../monitoring/logger.js';

const MAX_QUEUE_SIZE = 10000000; // 10M
const EXTERNAL_OVERFLOW_THRESHOLD = 8000000; // 8M
const SURGE_PRICING_THRESHOLD = 5000000; // 5M
const ADAPTIVE_THROTTLE_THRESHOLD = 1000000; // 1M
const CLIENT_QUOTA_PER_MIN = parseInt(process.env.CLIENT_QUOTA_PER_MIN) || 1000;

// Simple in-memory quota tracking for the POC/MVP
// In production, use Redis keys with TTL
const clientQuotas = new Map();

export class QueueBackpressure {
    /**
     * Rejects or allows a new job based on system load.
     * @param {Object} job - The job being submitted
     * @returns {Object} { allowed: boolean, reason: string, status: number, route: string }
     */
    static async evaluate(job) {
        const queueLength = await JobQueue.getLength();

        // 1. Absolute Maximum Check (10M)
        if (queueLength >= MAX_QUEUE_SIZE) {
            return { allowed: false, reason: 'Queue at absolute capacity (10M)', status: 429 };
        }

        // 2. External Provider Overflow (8M)
        if (queueLength >= EXTERNAL_OVERFLOW_THRESHOLD) {
            return {
                allowed: true,
                reason: 'Internal capacity reached, routing to external providers',
                status: 202,
                route: 'EXTERNAL'
            };
        }

        // 3. Surge Pricing Trigger (5M)
        if (queueLength >= SURGE_PRICING_THRESHOLD) {
            logger.warn({ queueLength }, 'Surge pricing activated (5M+)');
            // Logic handled in getPricingMultiplier
        }

        // 4. Adaptive Throttling (1M)
        if (queueLength >= ADAPTIVE_THROTTLE_THRESHOLD) {
            // In a production app, we'd inject an artificial delay or return a 'Retry-After' header
            logger.info({ queueLength }, 'Adaptive throttling active (1M+)');
        }

        // 5. Client Fairness check
        if (!this.checkClientQuota(job.client_id)) {
            return { allowed: false, reason: 'Client rate limit exceeded', status: 429 };
        }

        return { allowed: true, status: 202, route: 'INTERNAL' };
    }

    static checkClientQuota(clientId) {
        if (!clientId) return true;

        const now = Math.floor(Date.now() / 60000);
        const quotaKey = `${clientId}:${now}`;

        const currentUsage = clientQuotas.get(quotaKey) || 0;
        if (currentUsage >= CLIENT_QUOTA_PER_MIN) {
            return false;
        }

        clientQuotas.set(quotaKey, currentUsage + 1);

        // Cleanup
        if (clientQuotas.size > 5000) this.cleanupQuotas();

        return true;
    }

    static cleanupQuotas() {
        const now = Math.floor(Date.now() / 60000);
        for (const [key] of clientQuotas) {
            if (!key.endsWith(`:${now}`)) {
                clientQuotas.delete(key);
            }
        }
    }

    static getPricingMultiplier(queueLength) {
        if (queueLength >= SURGE_PRICING_THRESHOLD) return 5.0; // 5x multiplier
        if (queueLength >= ADAPTIVE_THROTTLE_THRESHOLD) return 2.0; // 2x multiplier
        return 1.0;
    }
}
