/**
 * Gateway Metrics (Module 6)
 *
 * Tracks all gateway-layer telemetry:
 *   gateway_requests   — total requests received
 *   gateway_latency    — running average latency in ms
 *   cache_hits         — edge cache hits
 *   regional_traffic   — per-region request counts { us-east: N, eu-west: N, ... }
 *
 * PostgreSQL-backed with in-memory mirror for zero-latency reads.
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
    }

    async init() {
        await this._ensureTable();
        await this._load();
    }

    // ─── Mutation helpers ─────────────────────────────────────────────────────

    async incRequests(n = 1) {
        this._mem.gateway_requests += n;
        await this._persist('gateway_requests', this._mem.gateway_requests);
    }

    async recordLatency(ms) {
        // Exponential moving average (α = 0.1)
        this._mem.gateway_latency = this._mem.gateway_latency === 0
            ? ms
            : 0.9 * this._mem.gateway_latency + 0.1 * ms;
        this._latencySamples++;
        await this._persist('gateway_latency', this._mem.gateway_latency);
    }

    async incCacheHits(n = 1) {
        this._mem.cache_hits += n;
        await this._persist('cache_hits', this._mem.cache_hits);
    }

    async incRegionalTraffic(region) {
        if (!region) return;
        this._mem.regional_traffic[region] = (this._mem.regional_traffic[region] || 0) + 1;
        await this._persistRegion(region, this._mem.regional_traffic[region]);
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

    async _ensureTable() {
        // Table gateway_metrics handled by init.sql
        /*
        try {
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS gateway_metrics (
                    key   TEXT PRIMARY KEY,
                    value REAL NOT NULL DEFAULT 0
                )
            `).run();
            for (const key of GatewayMetrics.SCALAR_KEYS) {
                await this.db.prepare("INSERT INTO gateway_metrics (key, value) VALUES ($1, 0) ON CONFLICT (key) DO NOTHING").run([key]);
            }
        } catch (e) {
            console.warn('[GatewayMetrics] Init:', e.message);
        }
        */
    }

    async _load() {
        try {
            const rows = await this.db.prepare('SELECT key, value FROM gateway_metrics').all();
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

    async _persist(key, value) {
        try {
            await this.db.prepare('UPDATE gateway_metrics SET value = $1 WHERE key = $2').run([value, key]);
        } catch (_) { /* non-fatal */ }
    }

    async _persistRegion(region, value) {
        const key = `region:${region}`;
        try {
            await this.db.prepare(`
                INSERT INTO gateway_metrics (key, value) VALUES ($1, $2)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            `).run([key, value]);
        } catch (_) { /* non-fatal */ }
    }
}
