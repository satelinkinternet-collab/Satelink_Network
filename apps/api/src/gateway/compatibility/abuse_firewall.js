/**
 * Abuse Firewall for Compatibility Gateway
 *
 * Lightweight per-client rate limiter enforced BEFORE enqueue.
 * Operates independently from the DemandBuffer's own rate limiter so
 * the gateway adds its own layer of protection.
 *
 * Limits (per client per endpoint type per window):
 *   rpc:     200 requests / 60 s
 *   compute:  50 requests / 60 s
 *   webhook:  30 requests / 60 s
 *
 * Permanently bannable clients (via ban() method) are always rejected.
 */

const LIMITS = {
    rpc: { max: 200, windowMs: 60_000 },
    compute: { max: 50, windowMs: 60_000 },
    webhook: { max: 30, windowMs: 60_000 },
    default: { max: 100, windowMs: 60_000 }
};

export class GatewayAbuseFirewall {
    constructor() {
        this._buckets = new Map();   // `${clientId}:${type}` → { count, windowStart }
        this._bannedClients = new Set();
    }

    /**
     * Check if a client is allowed to submit a request of given type.
     *
     * @param {string} clientId
     * @param {string} type        — 'rpc' | 'compute' | 'webhook'
     * @returns {{ ok: boolean, reason?: string }}
     */
    check(clientId, type = 'default') {
        if (this._bannedClients.has(clientId)) {
            return { ok: false, reason: `client ${clientId} is banned` };
        }

        const limit = LIMITS[type] || LIMITS.default;
        const key = `${clientId}:${type}`;
        const now = Date.now();
        let bucket = this._buckets.get(key);

        if (!bucket || now - bucket.windowStart > limit.windowMs) {
            bucket = { count: 0, windowStart: now };
            this._buckets.set(key, bucket);
        }

        if (bucket.count >= limit.max) {
            return {
                ok: false,
                reason: `rate limit exceeded for ${type} (max ${limit.max}/${limit.windowMs / 1000}s)`
            };
        }

        bucket.count++;
        return { ok: true };
    }

    ban(clientId) { this._bannedClients.add(clientId); }
    unban(clientId) { this._bannedClients.delete(clientId); }
    isBanned(clientId) { return this._bannedClients.has(clientId); }

    reset(clientId, type) {
        this._buckets.delete(`${clientId}:${type}`);
    }

    stats() {
        return {
            tracked_clients: new Set([...this._buckets.keys()].map(k => k.split(':')[0])).size,
            active_buckets: this._buckets.size,
            banned_clients: this._bannedClients.size
        };
    }
}
