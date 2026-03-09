import express from 'express';
import { JobProducer } from '../../queue/job_producer.js';

export function createAiRouter(db) {
    const router = express.Router();
    const producer = new JobProducer(db);

    /**
     * POST /v1/ai/inference
     * Submits an AI inference task (e.g., LLM prompt, image generation).
     */
    router.post('/inference', async (req, res) => {
        const { model, prompt, client_id, priority = 'NORMAL', reward = 0.05 } = req.body;

        if (!model || !prompt) {
            return res.status(400).json({ ok: false, error: 'model and prompt are required' });
        }

        const result = await producer.produce({
            type: 'ai_inference',
            client_id,
            payload: { model, prompt },
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
            message: 'AI Inference task accepted'
        });
    });

    return router;
}
