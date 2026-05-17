import express from 'express';
import { JobProducer } from '../../queue/job_producer.js';

export function createJobSubmitRouter(db) {
    const router = express.Router();
    const producer = new JobProducer(db);

    /**
     * POST /v1/jobs
     * Submits a new workload to the distributed queue.
     */
    router.post('/', async (req, res) => {
        const { type, client_id, payload, reward, priority = 'NORMAL' } = req.body;

        const result = await producer.produce({
            type,
            client_id,
            payload,
            reward,
            priority
        });

        if (!result.ok) {
            return res.status(result.code || 400).json({ ok: false, error: result.error });
        }

        res.status(202).json({
            ok: true,
            job_id: result.job_id,
            status: result.status,
            pricing_multiplier: result.pricing_multiplier,
            message: result.message
        });
    });

    return router;
}
