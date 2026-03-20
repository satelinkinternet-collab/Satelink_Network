/**
 * Workload Metrics (Module 5)
 *
 * Tracks cross-workload metrics for all three Day-1 revenue streams:
 *   rpc_requests      — total RPC calls received
 *   webhook_events    — total webhook deliveries attempted
 *   automation_jobs   — total automation jobs triggered
 *   daily_revenue     — cumulative estimated revenue (USD)
 *
 * PostgreSQL-backed with an in-memory mirror for zero-latency reads.
 * Auto-creates the workload_metrics table on construction.
 */

export class WorkloadMetrics {
    static KEYS = ['rpc_requests', 'webhook_events', 'automation_jobs', 'daily_revenue'];

    constructor(db) {
        this.db = db;
        this._mem = { rpc_requests: 0, webhook_events: 0, automation_jobs: 0, daily_revenue: 0 };
    }

    async init() {
        await this._ensureTable();
        await this._load();
    }

    // ─── Increment helpers ────────────────────────────────────────────────────

    async incRpc(n = 1) { return this._inc('rpc_requests', n); }
    async incWebhook(n = 1) { return this._inc('webhook_events', n); }
    async incAutomation(n = 1) { return this._inc('automation_jobs', n); }
    async addRevenue(usd) { return this._inc('daily_revenue', usd); }

    /**
     * Full snapshot of all tracked metrics.
     */
    snapshot() {
        return { ...this._mem };
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    async _inc(key, n) {
        this._mem[key] = (this._mem[key] || 0) + n;
        await this._persist(key, this._mem[key]);
        return this._mem[key];
    }

    async _ensureTable() {
        // Table workload_metrics handled by init.sql
        /*
        try {
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS workload_metrics (
                    key   TEXT PRIMARY KEY,
                    value REAL NOT NULL DEFAULT 0
                )
            `).run();
            for (const key of WorkloadMetrics.KEYS) {
                await this.db.prepare(`INSERT INTO workload_metrics (key, value) VALUES (?, 0) ON CONFLICT (key) DO NOTHING`).run([key]);
            }
        } catch (e) {
            console.warn('[WorkloadMetrics] Init warning:', e.message);
        }
        */
    }

    async _load() {
        try {
            const rows = await this.db.prepare('SELECT key, value FROM workload_metrics').all();
            for (const { key, value } of rows) {
                if (key in this._mem) this._mem[key] = value;
            }
        } catch (_) { /* use memory defaults */ }
    }

    async _persist(key, value) {
        try {
            await this.db.prepare('UPDATE workload_metrics SET value = ? WHERE key = ?').run([value, key]);
        } catch (_) { /* non-fatal */ }
    }
}
