import { Router } from 'express';
import { JobProducer } from '../../queue/job_producer.js';

const SUPPORTED_CHAINS = new Set(['ethereum', 'polygon', 'arbitrum', 'base']);

export function createRpcGateway(db) {
    const router = Router();
    const producer = new JobProducer(db);

    router.post('/:chain', async (req, res) => {
        const { chain } = req.params;

        if (!SUPPORTED_CHAINS.has(chain)) {
            return res.status(400).json({ ok: false, error: `Unsupported chain: ${chain}` });
        }

        const body = req.body;
        if (!body || body.jsonrpc !== '2.0' || !body.method) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC 2.0 payload' });
        }

        const result = await producer.produce({
            type: 'rpc_request',
            client_id: req.headers['x-api-key'] || 'rpc_gateway',
            payload: { chain, ...body },
            reward: 0.005, // Standard RPC reward
            priority: req.headers['x-priority'] || 'NORMAL'
        });

        if (!result.ok) {
            return res.status(result.code || 400).json({ ok: false, error: result.error });
        }

        res.status(202).json({
            ok: true,
            job_id: result.job_id,
            status: 'queued',
            chain
        });
    });

    return router;
}
