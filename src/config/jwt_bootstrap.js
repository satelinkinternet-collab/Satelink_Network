/**
 * jwt_bootstrap.js — Ephemeral JWT_SECRET for dev/simulate mode
 *
 * MUST be imported BEFORE auth.js in server.js to set env vars
 * before auth.js's validation IIFE runs.
 *
 * Only generates secrets when ALL of:
 *   1. JWT_SECRET is not already set (no .env value)
 *   2. DEV_ALLOW_EPHEMERAL_JWT=true
 *   3. SATELINK_MODE is not 'live'
 */

import { randomBytes } from "node:crypto";

if (!process.env.JWT_SECRET && process.env.DEV_ALLOW_EPHEMERAL_JWT === 'true') {
  if ((process.env.SATELINK_MODE || 'simulate').toLowerCase() !== 'live') {
    process.env.JWT_SECRET = randomBytes(64).toString('hex');
    if (!process.env.JWT_REFRESH_SECRET) {
      process.env.JWT_REFRESH_SECRET = randomBytes(64).toString('hex');
    }
    console.warn('[BOOT] Ephemeral JWT_SECRET generated (simulate mode). NOT for production.');
  }
}
