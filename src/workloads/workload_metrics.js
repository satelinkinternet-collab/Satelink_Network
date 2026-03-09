/**
 * Workload Metrics (Module 5)
 *
 * Tracks cross-workload metrics for all three Day-1 revenue streams:
 *   rpc_requests      — total RPC calls received
 *   webhook_events    — total webhook deliveries attempted
 *   automation_jobs   — total automation jobs triggered
 *   daily_revenue     — cumulative estimated revenue (USD)
 *
 * SQLite-backed with an in-memory mirror for zero-latency reads.
 * Auto-creates the workload_metrics table on construction.
 */

export class WorkloadMetrics {
    static KEYS = ['rpc_requests', 'webhook_events', 'automation_jobs', 'daily_revenue'];

    constructor(db) {
        this.db = db;
        this._mem = { rpc_requests: 0, webhook_events: 0, automation_jobs: 0, daily_revenue: 0 };
        this._ensureTable();
        this._load();
    }

    // ─── Increment helpers ────────────────────────────────────────────────────

    incRpc(n = 1) { return this._inc('rpc_requests', n); }
    incWebhook(n = 1) { return this._inc('webhook_events', n); }
    incAutomation(n = 1) { return this._inc('automation_jobs', n); }
    addRevenue(usd) { return this._inc('daily_revenue', usd); }

    /**
     * Full snapshot of all tracked metrics.
     */
    snapshot() {
        return { ...this._mem };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _inc(key, n) {
        this._mem[key] = (this._mem[key] || 0) + n;
        this._persist(key, this._mem[key]);
        return this._mem[key];
    }

    _ensureTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS workload_metrics (
                    key   TEXT PRIMARY KEY,
                    value REAL NOT NULL DEFAULT 0
                )
            `).run();
            for (const key of WorkloadMetrics.KEYS) {
                this.db.prepare(`INSERT OR IGNORE INTO workload_metrics (key, value) VALUES (?, 0)`).run(key);
            }
        } catch (e) {
            console.warn('[WorkloadMetrics] Init warning:', e.message);
        }
    }

    _load() {
        try {
            const rows = this.db.prepare('SELECT key, value FROM workload_metrics').all();
            for (const { key, value } of rows) {
                if (key in this._mem) this._mem[key] = value;
            }
        } catch (_) { /* use memory defaults */ }
    }

    _persist(key, value) {
        try {
            this.db.prepare('UPDATE workload_metrics SET value = ? WHERE key = ?').run(value, key);
        } catch (_) { /* non-fatal */ }
    }
}
