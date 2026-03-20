import express from 'express';
import { JobProducer } from '../../queue/job_producer.js';

/**
 * Supported AI models with per-model pricing (USDT per inference).
 * Add new models here as they become available on the network.
 */
const AI_MODEL_REGISTRY = {
    'llama-3-8b':     { reward: 0.03, timeout_ms: 30_000 },
    'llama-3-70b':    { reward: 0.08, timeout_ms: 60_000 },
    'mistral-7b':     { reward: 0.03, timeout_ms: 30_000 },
    'mixtral-8x7b':   { reward: 0.06, timeout_ms: 45_000 },
    'stable-diffusion':{ reward: 0.10, timeout_ms: 90_000 },
    'whisper-large':  { reward: 0.05, timeout_ms: 60_000 },
    'default':        { reward: 0.05, timeout_ms: 30_000 }
};

const SUPPORTED_MODELS = new Set(Object.keys(AI_MODEL_REGISTRY));

// Maximum prompt length to prevent abuse (32KB)
const MAX_PROMPT_LENGTH = 32_768;

export function createAiRouter(db) {
    const router = express.Router();
    const producer = new JobProducer(db);

    /**
     * POST /v1/ai/inference
     * Submits an AI inference task (e.g., LLM prompt, image generation).
     */
    router.post('/inference', async (req, res) => {
        const { model, prompt, client_id, priority = 'NORMAL', options } = req.body;

        if (!model || !prompt) {
            return res.status(400).json({ ok: false, error: 'model and prompt are required' });
        }

        if (!SUPPORTED_MODELS.has(model)) {
            return res.status(400).json({
                ok: false,
                error: `Unsupported model: ${model}. Supported: ${[...SUPPORTED_MODELS].join(', ')}`
            });
        }

        if (typeof prompt !== 'string' || prompt.length === 0) {
            return res.status(400).json({ ok: false, error: 'prompt must be a non-empty string' });
        }

        if (prompt.length > MAX_PROMPT_LENGTH) {
            return res.status(400).json({ ok: false, error: `prompt exceeds max length (${MAX_PROMPT_LENGTH} chars)` });
        }

        const modelConfig = AI_MODEL_REGISTRY[model];

        const result = await producer.produce({
            type: 'ai_inference',
            client_id: client_id || req.headers['x-api-key'] || 'ai_gateway',
            payload: {
                model,
                prompt,
                timeout_ms: modelConfig.timeout_ms,
                ...(options && typeof options === 'object' ? { options } : {})
            },
            reward: modelConfig.reward,
            priority: priority.toUpperCase()
        });

        if (!result.ok) {
            return res.status(result.code || 400).json({ ok: false, error: result.error });
        }

        res.status(202).json({
            ok: true,
            job_id: result.job_id,
            status: result.status,
            model,
            reward: modelConfig.reward,
            message: 'AI Inference task accepted'
        });
    });

    /**
     * GET /v1/ai/models
     * Lists supported AI models and their pricing.
     */
    router.get('/models', (req, res) => {
        const models = Object.entries(AI_MODEL_REGISTRY).map(([name, config]) => ({
            model: name,
            reward_usdt: config.reward,
            timeout_ms: config.timeout_ms
        }));
        res.status(200).json({ ok: true, models });
    });

    return router;
}
