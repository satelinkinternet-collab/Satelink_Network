/**
 * Demand Metrics (Module 4)
 *
 * Tracks real-time and cumulative metrics for the demand layer:
 *   - incoming_demand   : workloads received from all sources
 *   - served_demand     : workloads successfully dispatched to scheduler
 *   - unserved_demand   : workloads rejected (buffer full, rate limit, validation fail)
 *   - node_utilization  : percentage of active nodes currently busy (updated externally)
 *
 * Metrics are stored in PostgreSQL for durability (auto-creates table),
 * and also kept in memory for zero-latency reads.
 */

export class DemandMetrics {
    constructor(db) {
        this.db = db;
        this._memory = {
            incoming_demand: 0,
            served_demand: 0,
            unserved_demand: 0,
            node_utilization: 0   // 0–100 %
        };
    }

    async init() {
        await this._ensureTable();
        await this._load();
    }

    // ─── Mutation helpers ─────────────────────────────────────────────────────

    async recordIncoming(count = 1) {
        this._memory.incoming_demand += count;
        await this._persist('incoming_demand', this._memory.incoming_demand);
    }

    async recordServed(count = 1) {
        this._memory.served_demand += count;
        await this._persist('served_demand', this._memory.served_demand);
    }

    async recordUnserved(count = 1) {
        this._memory.unserved_demand += count;
        await this._persist('unserved_demand', this._memory.unserved_demand);
    }

    /** @param {number} pct  0–100 */
    async setNodeUtilization(pct) {
        this._memory.node_utilization = Math.max(0, Math.min(100, pct));
        await this._persist('node_utilization', this._memory.node_utilization);
    }

    // ─── Reads ────────────────────────────────────────────────────────────────

    /**
     * Returns a snapshot of all demand metrics.
     */
    snapshot() {
        return { ...this._memory };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    async _ensureTable() {
        // Table demand_metrics handled by init.sql
        /*
        try {
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS demand_metrics (
                    key   TEXT PRIMARY KEY,
                    value REAL NOT NULL DEFAULT 0
                )
            `).run();

            for (const key of ['incoming_demand', 'served_demand', 'unserved_demand', 'node_utilization']) {
                await this.db.prepare(`
                    INSERT INTO demand_metrics (key, value) VALUES ($1, 0) ON CONFLICT (key) DO NOTHING
                `).run([key]);
            }
        } catch (e) {
            console.warn('[DemandMetrics] Table init warning:', e.message);
        }
        */
    }

    async _load() {
        try {
            const rows = await this.db.prepare('SELECT key, value FROM demand_metrics').all();
            for (const { key, value } of rows) {
                if (key in this._memory) this._memory[key] = value;
            }
        } catch (_) { /* silent — in-memory defaults are fine */ }
    }

    async _persist(key, value) {
        try {
            await this.db.prepare('UPDATE demand_metrics SET value = $1 WHERE key = $2').run([value, key]);
        } catch (_) { /* non-fatal */ }
    }
}
