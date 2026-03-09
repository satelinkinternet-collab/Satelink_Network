/**
 * Demand Metrics (Module 4)
 *
 * Tracks real-time and cumulative metrics for the demand layer:
 *   - incoming_demand   : workloads received from all sources
 *   - served_demand     : workloads successfully dispatched to scheduler
 *   - unserved_demand   : workloads rejected (buffer full, rate limit, validation fail)
 *   - node_utilization  : percentage of active nodes currently busy (updated externally)
 *
 * Metrics are stored in SQLite for durability (auto-creates table),
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
        this._ensureTable();
        this._load();
    }

    // ─── Mutation helpers ─────────────────────────────────────────────────────

    recordIncoming(count = 1) {
        this._memory.incoming_demand += count;
        this._persist('incoming_demand', this._memory.incoming_demand);
    }

    recordServed(count = 1) {
        this._memory.served_demand += count;
        this._persist('served_demand', this._memory.served_demand);
    }

    recordUnserved(count = 1) {
        this._memory.unserved_demand += count;
        this._persist('unserved_demand', this._memory.unserved_demand);
    }

    /** @param {number} pct  0–100 */
    setNodeUtilization(pct) {
        this._memory.node_utilization = Math.max(0, Math.min(100, pct));
        this._persist('node_utilization', this._memory.node_utilization);
    }

    // ─── Reads ────────────────────────────────────────────────────────────────

    /**
     * Returns a snapshot of all demand metrics.
     */
    snapshot() {
        return { ...this._memory };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _ensureTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS demand_metrics (
                    key   TEXT PRIMARY KEY,
                    value REAL NOT NULL DEFAULT 0
                )
            `).run();

            for (const key of ['incoming_demand', 'served_demand', 'unserved_demand', 'node_utilization']) {
                this.db.prepare(`
                    INSERT OR IGNORE INTO demand_metrics (key, value) VALUES (?, 0)
                `).run(key);
            }
        } catch (e) {
            console.warn('[DemandMetrics] Table init warning:', e.message);
        }
    }

    _load() {
        try {
            const rows = this.db.prepare('SELECT key, value FROM demand_metrics').all();
            for (const { key, value } of rows) {
                if (key in this._memory) this._memory[key] = value;
            }
        } catch (_) { /* silent — in-memory defaults are fine */ }
    }

    _persist(key, value) {
        try {
            this.db.prepare('UPDATE demand_metrics SET value = ? WHERE key = ?').run(value, key);
        } catch (_) { /* non-fatal */ }
    }
}
