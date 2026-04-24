import { Router } from 'express';
import crypto from 'crypto';
import { routeRpcRequest, getRouterStats } from './router.js';
import { getSupportedChains, getChainConfig, CHAIN_ALIASES } from './providers.js';
import { getCached, setCached, isCacheable, getCacheStats } from './cache.js';

const SUPPORTED_CHAINS = new Set([...getSupportedChains(), ...Object.keys(CHAIN_ALIASES)]);

const RPC_REWARD_USDT = 0.0003;

export function createRpcGateway(db) {
    const router = Router();

    router.get('/stats/:chain', async (req, res) => {
        const { chain } = req.params;
        try {
            const providerStats = await getRouterStats(chain);
            const cacheStats = getCacheStats();
            res.json({
                ok: true,
                chain,
                providers: providerStats,
                cache: {
                    hits: cacheStats.hits,
                    misses: cacheStats.misses,
                    hitRate: `${cacheStats.hitRate}%`
                }
            });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });

    router.post('/:chain', async (req, res) => {
        const { chain } = req.params;

        if (!SUPPORTED_CHAINS.has(chain)) {
            return res.status(400).json({
                ok: false,
                error: `Unsupported chain: ${chain}. Supported: ${[...SUPPORTED_CHAINS].join(', ')}`
            });
        }

        const body = req.body;

        if (!body || body.jsonrpc !== '2.0' || !body.method) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC 2.0 payload: requires jsonrpc="2.0" and method' });
        }

        if (typeof body.method !== 'string' || body.method.length === 0) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC method' });
        }

        const client_id = req.headers['x-api-key'] || 'rpc_gateway';
        const request_id = `rpc_${crypto.randomUUID()}`;
        const method = body.method;
        const params = body.params || [];

        try {
            const cachedResponse = await getCached(chain, method, params);

            if (cachedResponse) {
                await recordRevenue(db, 'edge_cache', client_id, request_id);
                return res.status(200).json(cachedResponse);
            }

            const routeResult = await routeRpcRequest(chain, method, params, body.id);

            if (!routeResult.success) {
                return res.status(502).json({ ok: false, error: routeResult.error });
            }

            if (isCacheable(method)) {
                await setCached(chain, method, params, routeResult.result);
            }

            await recordRevenue(db, routeResult.provider || 'external_provider', client_id, request_id);

            res.status(200).json(routeResult.result);
        } catch (error) {
            console.error('[RPC Gateway] Execution error:', error.message);
            res.status(502).json({ ok: false, error: 'RPC execution failed', message: error.message });
        }
    });

    return router;
}

async function recordRevenue(db, source, client_id, request_id) {
    if (!db || !db.query) return;

    try {
        const now = Math.floor(Date.now() / 1000);
        await db.query(
            `INSERT INTO revenue_events_v2 (op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
             VALUES ('rpc_call', $1, $2, $3, 'success', $4, $5)`,
            [source, client_id, RPC_REWARD_USDT, request_id, now]
        );
        console.log(`[RPC Gateway] Revenue: ${source} → $${RPC_REWARD_USDT}`);
    } catch (e) {
        console.error('[RPC Gateway] Failed to record revenue:', e.message);
    }
}
