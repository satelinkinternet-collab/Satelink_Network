import { Router } from 'express';
import { JobProducer } from '../../queue/job_producer.js';

/**
 * Whitelisted RPC endpoints per chain.
 * Only these URLs are allowed as chain_rpc_url in job payloads.
 * Override via environment: CHAIN_RPC_<CHAIN>=<url>
 */
const CHAIN_RPC_URLS = {
    ethereum: process.env.CHAIN_RPC_ETHEREUM || 'https://eth.llamarpc.com',
    polygon:  process.env.CHAIN_RPC_POLYGON  || 'https://polygon-rpc.com',
    amoy:     process.env.CHAIN_RPC_AMOY     || 'https://rpc-amoy.polygon.technology',
    fuse:     process.env.CHAIN_RPC_FUSE     || 'https://rpc.fuse.io',
    arbitrum: process.env.CHAIN_RPC_ARBITRUM  || 'https://arb1.arbitrum.io/rpc',
    bsc:      process.env.CHAIN_RPC_BSC      || 'https://bsc-dataseed.binance.org',
    base:     process.env.CHAIN_RPC_BASE     || 'https://mainnet.base.org'
};

const SUPPORTED_CHAINS = new Set(Object.keys(CHAIN_RPC_URLS));

// RPC pricing: $0.0003 per request
const RPC_REWARD_USDT = 0.0003;

export function createRpcGateway(db) {
    const router = Router();
    const producer = new JobProducer(db);

    router.post('/:chain', async (req, res) => {
        const { chain } = req.params;

        if (!SUPPORTED_CHAINS.has(chain)) {
            return res.status(400).json({
                ok: false,
                error: `Unsupported chain: ${chain}. Supported: ${[...SUPPORTED_CHAINS].join(', ')}`
            });
        }

        const body = req.body;

        // Validate JSON-RPC 2.0 format
        if (!body || body.jsonrpc !== '2.0' || !body.method) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC 2.0 payload: requires jsonrpc="2.0" and method' });
        }

        if (typeof body.method !== 'string' || body.method.length === 0) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC method' });
        }

        const chain_rpc_url = CHAIN_RPC_URLS[chain];

        const result = await producer.produce({
            type: 'rpc_call',
            client_id: req.headers['x-api-key'] || 'rpc_gateway',
            payload: {
                chain,
                chain_rpc_url,
                method: body.method,
                params: body.params || [],
                id: body.id || 1
            },
            reward: RPC_REWARD_USDT,
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
