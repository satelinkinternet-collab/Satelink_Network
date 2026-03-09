/**
 * Gateway Metrics (Module 6)
 *
 * Tracks all gateway-layer telemetry:
 *   gateway_requests   — total requests received
 *   gateway_latency    — running average latency in ms
 *   cache_hits         — edge cache hits
 *   regional_traffic   — per-region request counts { us-east: N, eu-west: N, ... }
 *
 * SQLite-backed with in-memory mirror for zero-latency reads.
 * Auto-creates gateway_metrics table.
 *
 * Exposed via: GET /v1/gateway/metrics
 */

export class GatewayMetrics {
    static SCALAR_KEYS = ['gateway_requests', 'gateway_latency', 'cache_hits'];

    constructor(db) {
        this.db = db;
        this._mem = {
            gateway_requests: 0,
            gateway_latency: 0,   // exponential moving average
            cache_hits: 0,
            regional_traffic: {}
        };
        this._latencySamples = 0;
        this._ensureTable();
        this._load();
    }

    // ─── Mutation helpers ─────────────────────────────────────────────────────

    incRequests(n = 1) {
        this._mem.gateway_requests += n;
        this._persist('gateway_requests', this._mem.gateway_requests);
    }

    recordLatency(ms) {
        // Exponential moving average (α = 0.1)
        this._mem.gateway_latency = this._mem.gateway_latency === 0
            ? ms
            : 0.9 * this._mem.gateway_latency + 0.1 * ms;
        this._latencySamples++;
        this._persist('gateway_latency', this._mem.gateway_latency);
    }

    incCacheHits(n = 1) {
        this._mem.cache_hits += n;
        this._persist('cache_hits', this._mem.cache_hits);
    }

    incRegionalTraffic(region) {
        if (!region) return;
        this._mem.regional_traffic[region] = (this._mem.regional_traffic[region] || 0) + 1;
        this._persistRegion(region, this._mem.regional_traffic[region]);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    snapshot() {
        return {
            gateway_requests: this._mem.gateway_requests,
            gateway_latency: Math.round(this._mem.gateway_latency * 10) / 10,
            cache_hits: this._mem.cache_hits,
            regional_traffic: { ...this._mem.regional_traffic }
        };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _ensureTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS gateway_metrics (
                    key   TEXT PRIMARY KEY,
                    value REAL NOT NULL DEFAULT 0
                )
            `).run();
            for (const key of GatewayMetrics.SCALAR_KEYS) {
                this.db.prepare(`INSERT OR IGNORE INTO gateway_metrics (key, value) VALUES (?, 0)`).run(key);
            }
        } catch (e) {
            console.warn('[GatewayMetrics] Init:', e.message);
        }
    }

    _load() {
        try {
            const rows = this.db.prepare('SELECT key, value FROM gateway_metrics').all();
            for (const { key, value } of rows) {
                if (key.startsWith('region:')) {
                    const region = key.slice(7);
                    this._mem.regional_traffic[region] = value;
                } else if (key in this._mem) {
                    this._mem[key] = value;
                }
            }
        } catch (_) { /* use defaults */ }
    }

    _persist(key, value) {
        try {
            this.db.prepare('UPDATE gateway_metrics SET value = ? WHERE key = ?').run(value, key);
        } catch (_) { /* non-fatal */ }
    }

    _persistRegion(region, value) {
        const key = `region:${region}`;
        try {
            this.db.prepare(`INSERT OR REPLACE INTO gateway_metrics (key, value) VALUES (?, ?)`).run(key, value);
        } catch (_) { /* non-fatal */ }
    }
}
