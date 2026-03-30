import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Repo root: apps/api/src/utils -> ../../../../ */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** Writable in all environments; ingest may mirror to `.cursor/debug-14abae.log` when permitted. */
const DEBUG_LOG_PRIMARY = path.join(REPO_ROOT, 'apps', 'api', '.debug-14abae.ndjson');

/** Cursor session log path (may be blocked in some sandboxes / Docker). */
const DEBUG_LOG_CURSOR = path.join(REPO_ROOT, '.cursor', 'debug-14abae.log');

function line(payload) {
  return `${JSON.stringify({ sessionId: '14abae', timestamp: Date.now(), ...payload })}\n`;
}

function appendOne(filePath, lineStr) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, lineStr);
}

/**
 * Append one NDJSON line for debug session 14abae (never throws).
 * @param {Record<string, unknown>} payload
 */
export function appendDebugNdjson(payload) {
  const l = line(payload);
  try {
    appendOne(DEBUG_LOG_PRIMARY, l);
  } catch {
    /* ignore */
  }
  try {
    appendOne(DEBUG_LOG_CURSOR, l);
  } catch {
    /* ignore */
  }
}
