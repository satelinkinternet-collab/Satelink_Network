import { Router } from 'express';
import crypto from 'crypto';
import { routeRpcRequest, getRouterStats } from './router.js';
import { getSupportedChains, getChainConfig, CHAIN_ALIASES } from './providers.js';
import { getCached, setCached, isCacheable, getCacheStats } from './cache.js';
import { checkRateLimit, incrementUsage, createApiKey, getUsageStats, getTiers } from './rate_limiter.js';
import { createHealthEndpoint, startHealthMonitor } from './health_monitor.js';
import { createMetricsRouter } from './metrics.js';
import { recordRpcRevenue } from './rpc_billing.js';

const SUPPORTED_CHAINS = new Set([...getSupportedChains(), ...Object.keys(CHAIN_ALIASES)]);

const CHAIN_PRICING_USDT = {
    'ethereum': 0.00005,
    'eth': 0.00005,
    'polygon': 0.00003,
    'matic': 0.00003,
    'polygon-amoy': 0.00003,
    'amoy': 0.00003,
    'arbitrum': 0.00004,
    'arb': 0.00004,
    'base': 0.00004
};

const DEFAULT_RPC_REWARD_USDT = 0.00003;

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.socket?.remoteAddress ||
           'unknown';
}

export function createRpcGateway(db) {
    const router = Router();

    startHealthMonitor();
    createHealthEndpoint(router);

    const metricsRouter = createMetricsRouter(db);
    router.use('/', metricsRouter);

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
            console.error('[RPC Gateway] Stats error:', err.message);
            res.status(500).json({ ok: false, error: err.message });
        }
    });

    router.get('/tiers', (req, res) => {
        res.json({ ok: true, tiers: getTiers() });
    });

    router.get('/chains', (req, res) => {
        const chains = getSupportedChains().map(chainKey => {
            const config = getChainConfig(chainKey);
            return {
                chain: chainKey,
                chainId: config.chainId,
                name: config.name,
                providers: config.providers.length,
                priceUsdt: CHAIN_PRICING_USDT[chainKey] || DEFAULT_RPC_REWARD_USDT,
                aliases: Object.entries(CHAIN_ALIASES)
                    .filter(([_, v]) => v === chainKey)
                    .map(([k]) => k)
            };
        });
        res.json({ ok: true, chains });
    });

    router.get('/usage', async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(400).json({ ok: false, error: 'API key required' });
        }

        const stats = await getUsageStats(apiKey);
        if (!stats) {
            return res.status(404).json({ ok: false, error: 'Invalid API key' });
        }

        res.json({ ok: true, ...stats });
    });

    router.post('/keys', async (req, res) => {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_API_KEY) {
            return res.status(403).json({ ok: false, error: 'Admin access required' });
        }

        const { tier, owner } = req.body || {};
        if (!tier) {
            return res.status(400).json({ ok: false, error: 'Tier required' });
        }

        try {
            const result = await createApiKey(tier, owner);
            res.json({ ok: true, ...result });
        } catch (err) {
            console.error('[RPC Gateway] Key creation error:', err.message);
            res.status(400).json({ ok: false, error: err.message });
        }
    });

    router.post('/:chain', async (req, res) => {
        const { chain } = req.params;
        const apiKey = req.headers['x-api-key'];
        const clientIp = getClientIp(req);

        const rateCheck = await checkRateLimit(apiKey, clientIp);

        res.set({
            'X-RateLimit-Limit': rateCheck.limit,
            'X-RateLimit-Remaining': rateCheck.remaining,
            'X-RateLimit-Tier': rateCheck.tier
        });

        if (!rateCheck.allowed) {
            res.set('X-RateLimit-Reset', rateCheck.resetAt);
            return res.status(429).json({
                ok: false,
                error: 'Rate limit exceeded',
                tier: rateCheck.tier,
                limit: rateCheck.limit,
                resetAt: rateCheck.resetAt
            });
        }

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

        await incrementUsage(apiKey, clientIp);

        const client_id = apiKey || clientIp;
        const request_id = `rpc_${crypto.randomUUID()}`;
        const method = body.method;
        const params = body.params || [];

        try {
            const cachedResponse = await getCached(chain, method, params);

            if (cachedResponse) {
                await recordRpcRevenue({
                    pool: db,
                    chain,
                    method,
                    apiKey,
                    source: 'edge_cache',
                    requestId: request_id
                });
                return res.status(200).json(cachedResponse);
            }

            const routeResult = await routeRpcRequest(chain, method, params, body.id);

            if (!routeResult.success) {
                return res.status(502).json({ ok: false, error: routeResult.error });
            }

            if (isCacheable(method)) {
                await setCached(chain, method, params, routeResult.result);
            }

            await recordRpcRevenue({
                pool: db,
                chain,
                method,
                apiKey,
                source: routeResult.provider || 'external_provider',
                requestId: request_id
            });

            res.status(200).json(routeResult.result);
        } catch (error) {
            console.error('[RPC Gateway] Execution error:', error.message);
            res.status(502).json({ ok: false, error: 'RPC execution failed', message: error.message });
        }
    });

    return router;
}
