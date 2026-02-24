/**
 * golden_path.js — Mode status endpoint
 *
 * Provides GET /api/mode for observability.
 * Golden-path financial routes stay in their existing routers (integration, ledger).
 */

import express from 'express';
import { getCurrentMode, isLive, MODES } from '../config/mode.js';

export function createGoldenPathRouter() {
  const router = express.Router();

  router.get('/mode', (_req, res) => {
    res.json({
      ok: true,
      mode: getCurrentMode(),
      allowed_modes: Object.values(MODES),
      is_live: isLive(),
      live_requires: {
        env: 'SATELINK_MODE=live',
        dev_bypass_blocked: true,
        test_routes_blocked: true,
      },
    });
  });

  return router;
}
