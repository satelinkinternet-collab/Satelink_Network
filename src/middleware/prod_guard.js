/**
 * prod_guard.js — Day-1 Production Guard
 *
 * In LIVE mode: blocks /__test/* and /dev* routes, forcibly disables DEV_BYPASS_AUTH.
 * In SIMULATE mode: no-op passthrough.
 */

import { isLive } from '../config/mode.js';

const BLOCKED_PREFIXES = ['/__test', '/dev'];

export function createProdGuard() {
  // Defence-in-depth: kill dev bypass env vars once at startup in LIVE mode
  if (isLive()) {
    delete process.env.DEV_BYPASS_AUTH;
    delete process.env.ALLOW_DEV_BYPASS;
    console.log('[GUARD] LIVE mode: DEV_BYPASS_AUTH and ALLOW_DEV_BYPASS forcibly disabled');
  }

  return function prodGuard(req, res, next) {
    if (!isLive()) return next();

    const path = req.path.toLowerCase();
    for (const prefix of BLOCKED_PREFIXES) {
      if (path.startsWith(prefix)) {
        return res.status(404).json({ error: 'Not Found' });
      }
    }

    next();
  };
}
