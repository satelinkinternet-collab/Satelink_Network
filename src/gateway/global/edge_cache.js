/**
 * Edge Cache (Module 5)
 *
 * In-process LRU-style cache for frequent, idempotent gateway responses.
 *
 * Cache targets:
 *   - RPC responses (eth_blockNumber, eth_getBalance, eth_chainId, etc.)
 *   - Metadata queries (network/metrics, leaderboard)
 *
 * TTL is configurable per cache key prefix.
 * Max size cap prevents memory growth (LRU eviction when full).
 *
 * Usage:
 *   const cache = new EdgeCache();
 *   cache.set(key, value, ttlMs);
 *   const hit = cache.get(key);
 */

export class EdgeCache {
    static DEFAULT_TTL_MS = 5_000;     // 5 s default
    static MAX_ENTRIES = 5_000;     // LRU cap

    /** Per-prefix TTL overrides (ms) */
    static TTL_OVERRIDES = {
        eth_blockNumber: 2_000,        // 2 s — changes every ~12 s
        eth_chainId: 300_000,      // 5 min — static
        'network/metrics': 10_000,      // 10 s
        'leaderboard': 30_000        // 30 s
    };

    constructor() {
        // Map preserves insertion order — we use it as an LRU queue
        this._cache = new Map();
    }

    /**
     * Store a value under key with the given TTL.
     *
     * @param {string} key
     * @param {*}      value
     * @param {number} [ttlMs]   override TTL in ms
     */
    set(key, value, ttlMs) {
        // Evict oldest when full
        if (this._cache.size >= EdgeCache.MAX_ENTRIES) {
            const oldest = this._cache.keys().next().value;
            this._cache.delete(oldest);
        }

        const ttl = ttlMs ?? this._deriveTtl(key);
        this._cache.set(key, { value, expiresAt: Date.now() + ttl });
    }

    /**
     * Retrieve a cached value, or null if missing / expired.
     *
     * @param {string} key
     * @returns {* | null}
     */
    get(key) {
        const entry = this._cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this._cache.delete(key);
            return null;          // expired
        }

        // Move to end (LRU touch)
        this._cache.delete(key);
        this._cache.set(key, entry);
        return entry.value;
    }

    /**
     * Delete a key immediately.
     */
    invalidate(key) {
        this._cache.delete(key);
    }

    /**
     * Remove all expired entries (maintenance sweep).
     * @returns {number} entries removed
     */
    sweep() {
        const now = Date.now();
        let removed = 0;
        for (const [k, v] of this._cache) {
            if (now > v.expiresAt) { this._cache.delete(k); removed++; }
        }
        return removed;
    }

    /**
     * Current number of live (non-expired) cache entries.
     */
    size() {
        this.sweep();
        return this._cache.size;
    }

    /**
     * cache key → boolean: is cached and not expired?
     */
    has(key) {
        return this.get(key) !== null;
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _deriveTtl(key) {
        for (const [prefix, ttl] of Object.entries(EdgeCache.TTL_OVERRIDES)) {
            if (key.includes(prefix)) return ttl;
        }
        return EdgeCache.DEFAULT_TTL_MS;
    }
}
