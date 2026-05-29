import { Router } from 'express';
import { JobProducer } from '../../queue/job_producer.js';

// Webhook pricing: $0.001 per delivery
const WEBHOOK_REWARD_USDT = 0.001;

// Maximum payload size (64KB)
const MAX_PAYLOAD_SIZE = 65_536;

// Maximum retry attempts
const MAX_RETRIES = 5;

// Valid retry backoff strategies
const VALID_BACKOFF = new Set(['linear', 'exponential', 'fixed']);

/**
 * SSRF protection: block requests to private/internal IP ranges.
 * Checks the hostname of the target URL against known private ranges.
 */
function isPrivateUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        const hostname = parsed.hostname.toLowerCase();

        // Block localhost variants
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
            return true;
        }

        // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
        const parts = hostname.split('.');
        if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
            const [a, b] = parts.map(Number);
            if (a === 10) return true;
            if (a === 172 && b >= 16 && b <= 31) return true;
            if (a === 192 && b === 168) return true;
            if (a === 169 && b === 254) return true; // link-local
            if (a === 0) return true;
        }

        // Block internal hostnames
        if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
            return true;
        }

        // Require HTTPS or HTTP scheme only
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return true;
        }

        return false;
    } catch {
        return true;
    }
}

export function createWebhookRouter(db) {
    const router = Router();
    const producer = new JobProducer(db);

    router.post('/', async (req, res) => {
        const { url, payload, retry_policy, headers } = req.body;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ ok: false, error: 'url is required' });
        }

        try { new URL(url); } catch {
            return res.status(400).json({ ok: false, error: 'Invalid URL format' });
        }

        // SSRF protection
        if (isPrivateUrl(url)) {
            return res.status(400).json({ ok: false, error: 'Target URL must be a public endpoint' });
        }

        // Payload size check
        if (payload && JSON.stringify(payload).length > MAX_PAYLOAD_SIZE) {
            return res.status(400).json({ ok: false, error: `Payload exceeds max size (${MAX_PAYLOAD_SIZE} bytes)` });
        }

        // Validate retry_policy if provided
        let validatedRetry = { max_retries: 3, backoff: 'exponential' };
        if (retry_policy && typeof retry_policy === 'object') {
            const retries = parseInt(retry_policy.max_retries);
            if (!isNaN(retries) && retries >= 0 && retries <= MAX_RETRIES) {
                validatedRetry.max_retries = retries;
            }
            if (retry_policy.backoff && VALID_BACKOFF.has(retry_policy.backoff)) {
                validatedRetry.backoff = retry_policy.backoff;
            }
        }

        const result = await producer.produce({
            type: 'webhook_delivery',
            client_id: req.headers['x-api-key'] || 'webhook_api',
            payload: {
                target_url: url,
                body: payload || {},
                headers: headers && typeof headers === 'object' ? headers : {},
                retry_policy: validatedRetry
            },
            reward: WEBHOOK_REWARD_USDT,
            priority: req.headers['x-priority'] || 'NORMAL'
        });

        if (!result.ok) {
            return res.status(result.code || 400).json({ ok: false, error: result.error });
        }

        res.status(202).json({
            ok: true,
            job_id: result.job_id,
            status: 'queued',
            target_url: url
        });
    });

    return router;
}
