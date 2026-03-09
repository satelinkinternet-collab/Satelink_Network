import { Router } from 'express';
import { JobProducer } from '../../queue/job_producer.js';

export function createWebhookRouter(db) {
    const router = Router();
    const producer = new JobProducer(db);

    router.post('/', async (req, res) => {
        const { url, payload, retry_policy } = req.body;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ ok: false, error: 'url is required' });
        }

        try { new URL(url); } catch {
            return res.status(400).json({ ok: false, error: 'Invalid URL' });
        }

        const result = await producer.produce({
            type: 'webhook_delivery',
            client_id: req.headers['x-api-key'] || 'webhook_api',
            payload: { url, body: payload, retry_policy },
            reward: 0.02, // Webhook reward
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
