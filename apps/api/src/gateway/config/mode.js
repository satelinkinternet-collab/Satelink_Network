/**
 * mode.js — Satelink Day-1 Mode Configuration
 *
 * Single source of truth for simulate/live mode.
 * Default: simulate (dev-safe). LIVE requires explicit SATELINK_MODE=live.
 */

export const MODES = Object.freeze({
  SIMULATE: 'simulate',
  LIVE: 'live',
});

const VALID = new Set(Object.values(MODES));

const _raw = (process.env.SATELINK_MODE || 'simulate').toLowerCase().trim();

if (!VALID.has(_raw)) {
  console.error(`[FATAL] Invalid SATELINK_MODE="${process.env.SATELINK_MODE}". Must be: simulate | live`);
  process.exit(1);
}

const _mode = _raw;

export function getCurrentMode() { return _mode; }
export function isLive() { return _mode === MODES.LIVE; }
export function isSimulate() { return _mode === MODES.SIMULATE; }
