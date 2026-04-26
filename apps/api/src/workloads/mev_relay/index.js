/**
 * MEV Private Relay (S3-001)
 *
 * Private mempool relay for MEV searchers.
 * Transactions are NOT broadcast to public mempool — submitted directly to validators.
 *
 * Pricing: 10x standard RPC rate ($0.001 per tx vs $0.0001)
 * Auth: Requires API key (no free tier)
 *
 * Endpoints:
 * - POST /rpc/mev — Submit private transaction
 * - POST /rpc/mev/bundle — Submit MEV bundle (Flashbots-compatible)
 * - GET /rpc/mev/status — Relay health and stats
 */

import { Router } from 'express';
import crypto from 'crypto';

const MEV_PROVIDERS = {
  ethereum: [
    { name: 'flashbots', url: 'https://rpc.flashbots.net', priority: 1 },
    { name: 'mev-blocker', url: 'https://rpc.mevblocker.io', priority: 2 }
  ],
  polygon: [
    { name: 'llama-mev', url: 'https://polygon.llamarpc.com', priority: 1 }
  ],
  arbitrum: [
    { name: 'llama-mev', url: 'https://arbitrum.llamarpc.com', priority: 1 }
  ]
};

const MEV_PRICING_USDT = {
  eth_sendRawTransaction: 0.001,
  eth_sendBundle: 0.005,
  eth_sendPrivateTransaction: 0.001
};

const DEFAULT_MEV_PRICE = 0.001;

const mevStats = {
  totalSubmissions: 0,
  successfulSubmissions: 0,
  failedSubmissions: 0,
  bundlesSubmitted: 0,
  revenueUsdt: 0,
  lastSubmissionAt: null
};

async function submitToMevProvider(chain, method, params, timeout = 10000) {
  const providers = MEV_PROVIDERS[chain];
  if (!providers || providers.length === 0) {
    throw new Error(`No MEV providers available for chain: ${chain}`);
  }

  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority);
  let lastError = null;

  for (const provider of sortedProviders) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new Error(`Provider ${provider.name} returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.error) {
        lastError = new Error(data.error.message || 'MEV provider error');
        continue;
      }

      return {
        success: true,
        provider: provider.name,
        result: data.result,
        bundleId: data.result?.bundleHash || crypto.randomUUID()
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      console.error(`[MEV] Provider ${provider.name} failed:`, err.message);
    }
  }

  throw lastError || new Error('All MEV providers failed');
}

async function recordMevRevenue(db, method, clientId, requestId, chain) {
  if (!db || !db.query) return;

  const amount = MEV_PRICING_USDT[method] || DEFAULT_MEV_PRICE;

  try {
    const now = Math.floor(Date.now() / 1000);
    await db.query(
      `INSERT INTO revenue_events_v2 (op_type, node_id, client_id, amount_usdt, status, request_id, created_at)
       VALUES ('mev_relay', $1, $2, $3, 'success', $4, $5)`,
      ['mev_private', clientId, amount, requestId, now]
    );

    mevStats.revenueUsdt += amount;
    console.log(`[MEV] Revenue: ${chain}/${method} → $${amount}`);
  } catch (e) {
    console.error('[MEV] Failed to record revenue:', e.message);
  }
}

async function validateApiKey(apiKey, db) {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return { valid: false, error: 'MEV relay requires a valid API key (sk_live_*)' };
  }

  if (!db || !db.query) {
    return { valid: true, tier: 'basic' };
  }

  try {
    const result = await db.query(
      `SELECT tier, status FROM rpc_api_keys
       WHERE key_hash = encode(sha256($1::bytea), 'hex') AND status = 'active'`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid or inactive API key' };
    }

    const tier = result.rows[0].tier;
    if (tier === 'public') {
      return { valid: false, error: 'MEV relay not available on public tier. Upgrade to basic or above.' };
    }

    return { valid: true, tier };
  } catch (e) {
    return { valid: true, tier: 'basic' };
  }
}

export function createMevRelayRouter(db, redis) {
  const router = Router();

  router.get('/status', (req, res) => {
    const chains = Object.keys(MEV_PROVIDERS).map(chain => ({
      chain,
      providers: MEV_PROVIDERS[chain].length,
      available: MEV_PROVIDERS[chain].length > 0
    }));

    res.json({
      ok: true,
      status: 'operational',
      chains,
      stats: {
        totalSubmissions: mevStats.totalSubmissions,
        successRate: mevStats.totalSubmissions > 0
          ? ((mevStats.successfulSubmissions / mevStats.totalSubmissions) * 100).toFixed(1) + '%'
          : 'N/A',
        bundlesSubmitted: mevStats.bundlesSubmitted,
        revenueUsdt: mevStats.revenueUsdt.toFixed(6),
        lastSubmissionAt: mevStats.lastSubmissionAt
      },
      pricing: MEV_PRICING_USDT
    });
  });

  router.post('/', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const keyCheck = await validateApiKey(apiKey, db);

    if (!keyCheck.valid) {
      return res.status(403).json({ ok: false, error: keyCheck.error });
    }

    const { chain = 'ethereum' } = req.query;
    const body = req.body;

    if (!body || body.jsonrpc !== '2.0' || !body.method) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON-RPC 2.0 payload' });
    }

    const method = body.method;
    const params = body.params || [];

    const allowedMethods = ['eth_sendRawTransaction', 'eth_sendPrivateTransaction', 'eth_sendBundle'];
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        ok: false,
        error: `MEV relay only supports: ${allowedMethods.join(', ')}`
      });
    }

    const requestId = `mev_${crypto.randomUUID()}`;
    mevStats.totalSubmissions++;

    try {
      const result = await submitToMevProvider(chain, method, params);

      mevStats.successfulSubmissions++;
      mevStats.lastSubmissionAt = new Date().toISOString();
      if (method === 'eth_sendBundle') {
        mevStats.bundlesSubmitted++;
      }

      await recordMevRevenue(db, method, apiKey || 'anonymous', requestId, chain);

      res.json({
        jsonrpc: '2.0',
        id: body.id || null,
        result: result.result,
        _mev: {
          bundleId: result.bundleId,
          provider: result.provider,
          requestId,
          priceUsdt: MEV_PRICING_USDT[method] || DEFAULT_MEV_PRICE
        }
      });
    } catch (err) {
      mevStats.failedSubmissions++;
      console.error('[MEV] Submission failed:', err.message);

      res.status(502).json({
        jsonrpc: '2.0',
        id: body.id || null,
        error: {
          code: -32603,
          message: 'MEV submission failed',
          data: err.message
        }
      });
    }
  });

  router.post('/bundle', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const keyCheck = await validateApiKey(apiKey, db);

    if (!keyCheck.valid) {
      return res.status(403).json({ ok: false, error: keyCheck.error });
    }

    const { chain = 'ethereum' } = req.query;
    const { txs, blockNumber, minTimestamp, maxTimestamp } = req.body || {};

    if (!txs || !Array.isArray(txs) || txs.length === 0) {
      return res.status(400).json({ ok: false, error: 'txs array required' });
    }

    const requestId = `mev_bundle_${crypto.randomUUID()}`;
    mevStats.totalSubmissions++;
    mevStats.bundlesSubmitted++;

    try {
      const bundleParams = [{
        txs,
        blockNumber: blockNumber || 'latest',
        minTimestamp,
        maxTimestamp
      }];

      const result = await submitToMevProvider(chain, 'eth_sendBundle', bundleParams);

      mevStats.successfulSubmissions++;
      mevStats.lastSubmissionAt = new Date().toISOString();

      await recordMevRevenue(db, 'eth_sendBundle', apiKey || 'anonymous', requestId, chain);

      res.json({
        ok: true,
        bundleHash: result.bundleId,
        provider: result.provider,
        requestId,
        priceUsdt: MEV_PRICING_USDT.eth_sendBundle
      });
    } catch (err) {
      mevStats.failedSubmissions++;
      console.error('[MEV] Bundle submission failed:', err.message);

      res.status(502).json({
        ok: false,
        error: 'Bundle submission failed',
        message: err.message
      });
    }
  });

  return router;
}
