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
    static KEYS = ['rpc_requests', 'webhook_events', 'automation_jobs', 'ai_inferences', 'daily_revenue'];

    constructor(db) {
        this.db = db;
        this._mem = { rpc_requests: 0, webhook_events: 0, automation_jobs: 0, ai_inferences: 0, daily_revenue: 0 };
        this._ensureTable();
        this._ensureAttributionTable();
        this._load();
    }

    // ─── Increment helpers ────────────────────────────────────────────────────

    incRpc(n = 1) { return this._inc('rpc_requests', n); }
    incWebhook(n = 1) { return this._inc('webhook_events', n); }
    incAutomation(n = 1) { return this._inc('automation_jobs', n); }
    incAi(n = 1) { return this._inc('ai_inferences', n); }
    addRevenue(usd) { return this._inc('daily_revenue', usd); }

    /**
     * Record revenue attribution per workload type and source.
     * @param {string} workloadType - rpc_call, ai_inference, webhook_delivery, automation_job, etc.
     * @param {number} revenueUsdt - revenue amount in USDT
     * @param {string} [source] - demand source (rpc_gateway, ai_gateway, demand_engine, etc.)
     */
    recordAttribution(workloadType, revenueUsdt, source = 'direct') {
        const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        try {
            this.db.prepare(`
                INSERT INTO revenue_attribution (date_key, workload_type, source, revenue_usdt, job_count)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT (date_key, workload_type, source)
                DO UPDATE SET revenue_usdt = revenue_usdt + ?, job_count = job_count + 1
            `).run(dateKey, workloadType, source, revenueUsdt, revenueUsdt);
        } catch (e) {
            // Non-fatal — attribution is telemetry, not critical path
        }
    }

    /**
     * Get revenue attribution breakdown for a date range.
     * @param {string} [fromDate] - YYYY-MM-DD (defaults to 7 days ago)
     * @param {string} [toDate] - YYYY-MM-DD (defaults to today)
     * @returns {Array<{ date_key, workload_type, source, revenue_usdt, job_count }>}
     */
    getAttribution(fromDate, toDate) {
        const to = toDate || new Date().toISOString().slice(0, 10);
        const from = fromDate || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        try {
            return this.db.prepare(`
                SELECT date_key, workload_type, source, revenue_usdt, job_count
                FROM revenue_attribution
                WHERE date_key BETWEEN ? AND ?
                ORDER BY date_key DESC, revenue_usdt DESC
            `).all(from, to);
        } catch (e) {
            return [];
        }
    }

    /**
     * Get profitability summary grouped by workload type.
     * @returns {Array<{ workload_type, total_revenue, total_jobs, avg_revenue_per_job }>}
     */
    getProfitability() {
        try {
            return this.db.prepare(`
                SELECT workload_type,
                       SUM(revenue_usdt) as total_revenue,
                       SUM(job_count) as total_jobs,
                       ROUND(SUM(revenue_usdt) / MAX(SUM(job_count), 1), 6) as avg_revenue_per_job
                FROM revenue_attribution
                GROUP BY workload_type
                ORDER BY total_revenue DESC
            `).all();
        } catch (e) {
            return [];
        }
    }

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

    _ensureAttributionTable() {
        try {
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS revenue_attribution (
                    date_key       TEXT NOT NULL,
                    workload_type  TEXT NOT NULL,
                    source         TEXT NOT NULL DEFAULT 'direct',
                    revenue_usdt   REAL NOT NULL DEFAULT 0,
                    job_count      INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (date_key, workload_type, source)
                )
            `).run();
        } catch (e) {
            console.warn('[WorkloadMetrics] Attribution table init warning:', e.message);
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
