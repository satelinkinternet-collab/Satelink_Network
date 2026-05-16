/**
 * Simple API Key Management
 * POST /api/keys — Create free tier key (no auth required)
 * GET /api/keys/:key/usage — Check usage
 */

import { Router } from 'express';
import {
  createApiKeyWithCredits,
  getKeyUsageSummary,
  ensureCreditTables,
  TIERS
} from './credit_system.mjs';

export function createSimpleApiKeysRouter(pool) {
  const router = Router();

  ensureCreditTables(pool);

  router.post('/', async (req, res) => {
    const { tier = 'free', wallet_address } = req.body || {};

    if (!TIERS[tier]) {
      return res.status(400).json({
        ok: false,
        error: `Invalid tier: ${tier}`,
        valid_tiers: Object.keys(TIERS)
      });
    }

    if (tier !== 'free') {
      return res.status(400).json({
        ok: false,
        error: 'Only free tier available via self-service. Contact us for paid tiers.',
        upgrade_url: 'https://app.satelink.network/satelink/os/plans'
      });
    }

    try {
      const result = await createApiKeyWithCredits(pool, tier, wallet_address || null);

      return res.json({
        ok: true,
        api_key: result.api_key,
        tier: result.tier,
        daily_limit: result.daily_limit,
        usage: `Add header: X-API-Key: ${result.api_key}`,
        example: `curl -X POST https://rpc.satelink.network/rpc/polygon -H "X-API-Key: ${result.api_key}" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`,
        docs: 'https://docs.satelink.network'
      });
    } catch (err) {
      console.error('[ApiKeys] Create failed:', err.message);
      return res.status(500).json({ ok: false, error: 'Failed to create API key' });
    }
  });

  router.get('/:key/usage', async (req, res) => {
    const { key } = req.params;

    if (!key || (!key.startsWith('sk_free') && !key.startsWith('sk_basic') && !key.startsWith('sk_pro') && !key.startsWith('sk_ent') && !key.startsWith('sk_live'))) {
      return res.status(400).json({ ok: false, error: 'Invalid API key format' });
    }

    try {
      const usage = await getKeyUsageSummary(pool, key);

      if (!usage) {
        return res.status(404).json({ ok: false, error: 'API key not found' });
      }

      return res.json({ ok: true, ...usage });
    } catch (err) {
      console.error('[ApiKeys] Usage check failed:', err.message);
      return res.status(500).json({ ok: false, error: 'Failed to get usage' });
    }
  });

  router.get('/tiers', (req, res) => {
    const tiers = Object.entries(TIERS).map(([name, config]) => ({
      tier: name,
      daily_limit: config.daily_limit,
      price_usdt_month: config.price_usdt,
      available: name === 'free'
    }));

    res.json({ ok: true, tiers });
  });

  return router;
}
