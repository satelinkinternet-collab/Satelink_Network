/**
 * Demand Buffer (Module 5)
 *
 * A lightweight in-process FIFO queue that holds normalised workloads
 * temporarily before they are dispatched to the scheduler.
 *
 * Deliberately avoids Redis dependency so the demand layer can operate
 * even when the Redis-backed JobQueue is unavailable.  Once the scheduler
 * is ready it drains the buffer via DemandRouter.
 *
 * Safety limits (Module 6):
 *   - Maximum buffer depth (MAX_SIZE)
 *   - Maximum payload size in bytes (MAX_PAYLOAD_BYTES)
 *   - Rate limiting per source key (MAX_PER_WINDOW / WINDOW_MS)
 */

export class DemandBuffer {
    static MAX_SIZE = 10_000;       // max workloads in buffer
    static MAX_PAYLOAD_BYTES = 10_240;       // 10 KB per workload payload
    static MAX_PER_WINDOW = 100;          // max submissions per source per window
    static WINDOW_MS = 60_000;       // 1-minute sliding window

    constructor() {
        this._queue = [];
        this._rateLimiter = new Map();   // sourceKey → { count, windowStart }
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Enqueue a normalised workload.
     * Applies all safety checks before accepting.
     *
     * @param {Object} workload   - { op_type, target, payload, reward }
     * @param {string} [sourceKey] - identifier for rate-limit bucketing ('rpc', 'webhook', 'ai', 'automation', 'ops_api')
     * @returns {{ accepted: boolean, reason?: string }}
     */
    enqueue(workload, sourceKey = 'default') {
        // 1. Rate limit check
        const rateLimitResult = this._checkRateLimit(sourceKey);
        if (!rateLimitResult.ok) {
            return { accepted: false, reason: rateLimitResult.reason };
        }

        // 2. Buffer capacity check
        if (this._queue.length >= DemandBuffer.MAX_SIZE) {
            return { accepted: false, reason: 'demand buffer full — try again shortly' };
        }

        // 3. Payload validation
        const validation = this._validateWorkload(workload);
        if (!validation.ok) {
            return { accepted: false, reason: validation.reason };
        }

        // 4. Maximum payload size
        const payloadStr = JSON.stringify(workload.payload);
        if (Buffer.byteLength(payloadStr, 'utf8') > DemandBuffer.MAX_PAYLOAD_BYTES) {
            return { accepted: false, reason: 'payload exceeds 10 KB maximum' };
        }

        this._queue.push({ ...workload, _buffered_at: Date.now() });
        this._incrementRateLimit(sourceKey);
        return { accepted: true };
    }

    /**
     * Drain up to `limit` workloads from the front of the queue.
     *
     * @param {number} limit
     * @returns {Array} workloads
     */
    drain(limit = 50) {
        return this._queue.splice(0, limit);
    }

    /**
     * Non-destructive peek at the current queue depth.
     */
    size() {
        return this._queue.length;
    }

    /**
     * Clear the entire buffer (for testing / emergency flush).
     */
    clear() {
        this._queue = [];
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _validateWorkload(w) {
        const VALID_OP_TYPES = new Set([
            'rpc_call', 'ai_inference', 'automation_job', 'webhook_delivery', 'data_processing', 'oracle_fetch', 'overflow_compute'
        ]);

        if (!w || typeof w !== 'object') return { ok: false, reason: 'workload must be an object' };
        if (!w.op_type || !VALID_OP_TYPES.has(w.op_type)) return { ok: false, reason: `invalid op_type: ${w.op_type}` };
        if (!w.target) return { ok: false, reason: 'target is required' };
        if (!w.payload || typeof w.payload !== 'object') return { ok: false, reason: 'payload must be an object' };
        if (typeof w.reward !== 'number' || w.reward < 0) return { ok: false, reason: 'reward must be a non-negative number' };

        // Special validation for overflow compute
        if (w.op_type === 'overflow_compute' && w.reward < 0.4) {
            return { ok: false, reason: 'reward too low for overflow compute (min 0.4)' };
        }

        return { ok: true };
    }

    _checkRateLimit(key) {
        const now = Date.now();
        let bucket = this._rateLimiter.get(key);

        if (!bucket || now - bucket.windowStart > DemandBuffer.WINDOW_MS) {
            // New or expired window — reset
            bucket = { count: 0, windowStart: now };
            this._rateLimiter.set(key, bucket);
        }

        if (bucket.count >= DemandBuffer.MAX_PER_WINDOW) {
            return { ok: false, reason: `rate limit exceeded for source: ${key} (max ${DemandBuffer.MAX_PER_WINDOW}/min)` };
        }

        return { ok: true };
    }

    _incrementRateLimit(key) {
        const bucket = this._rateLimiter.get(key);
        if (bucket) bucket.count += 1;
    }
}
