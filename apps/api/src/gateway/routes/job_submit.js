import express from 'express';
import { JobProducer } from '../../queue/job_producer.js';

export function createJobSubmitRouter(db) {
    const router = express.Router();
    const producer = new JobProducer(db);

    /**
     * POST /v1/jobs
     * Submits a new workload to the distributed queue AND records revenue.
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

        // Record revenue event via opsEngine (the queue consumer is not running in-process)
        try {
            const opsEngine = global.opsEngine;
            if (opsEngine) {
                if (!opsEngine.initialized) await opsEngine.init();
                await opsEngine.executeOp({
                    op_type: type,
                    node_id: 'job_queue',
                    client_id: client_id || 'anonymous',
                    request_id: result.job_id,
                    timestamp: Math.floor(Date.now() / 1000),
                    payload_hash: `hash_${result.job_id}`,
                });
            }
        } catch (e) {
            console.error('[JobSubmit] executeOp failed:', e.message);
            // Non-blocking — job was already queued successfully
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
