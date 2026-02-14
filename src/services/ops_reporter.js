
export class OpsReporter {
    constructor(db) {
        this.db = db;
    }

    async init() {
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS daily_ops_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_ts INTEGER,
                end_ts INTEGER,
                error_count INTEGER,
                slow_query_count INTEGER,
                incident_count INTEGER,
                beta_user_count INTEGER,
                active_invites INTEGER,
                top_errors TEXT, -- JSON
                top_slow_queries TEXT, -- JSON
                created_at INTEGER
            )
        `);

        // Phase 22: Safe Mode Autopilot Check
        // Run every minute
        setInterval(() => this.runHealthCheck(), 60000);
    }

    async runDailyReport() {
        // Report for last 24h
        const now = Math.floor(Date.now() / 1000);
        const yesterday = now - 86400;

        // Stats
        const errors = await this.db.get("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?", [yesterday * 1000]);
        const slowQs = await this.db.get("SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?", [yesterday * 1000]);
        const incidents = await this.db.get("SELECT COUNT(*) as c FROM incident_bundles WHERE created_at > ?", [yesterday * 1000]);
        const betaUsers = await this.db.get("SELECT COUNT(*) as c FROM beta_users WHERE status = 'active'");
        const invites = await this.db.get("SELECT COUNT(*) as c FROM beta_invites WHERE status = 'active'");

        // Top Lists
        const topErrors = await this.db.query(`
            SELECT service, message, COUNT(*) as count 
            FROM error_events 
            WHERE last_seen_at > ? 
            GROUP BY service, message 
            ORDER BY count DESC LIMIT 5
        `, [yesterday * 1000]);

        const topSlowQs = await this.db.query(`
            SELECT sample_sql, AVG(avg_ms) as avg_ms, COUNT(*) as count 
            FROM slow_queries 
            WHERE last_seen_at > ? 
            GROUP BY sample_sql 
            ORDER BY avg_ms DESC LIMIT 5
        `, [yesterday * 1000]);

        // Insert
        const res = await this.db.query(`
            INSERT INTO daily_ops_reports 
            (start_ts, end_ts, error_count, slow_query_count, incident_count, beta_user_count, active_invites, top_errors, top_slow_queries, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            yesterday, now,
            errors.c, slowQs.c, incidents.c, betaUsers.c, invites.c,
            JSON.stringify(topErrors), JSON.stringify(topSlowQs),
            now
        ]);

        return { id: res.lastInsertRowid || res[0]?.id };
    }

    async getReports(limit = 10) {
        const reports = await this.db.query("SELECT * FROM daily_ops_reports ORDER BY created_at DESC LIMIT ?", [limit]);
        return reports.map(r => ({
            ...r,
            top_errors: JSON.parse(r.top_errors || '[]'),
            top_slow_queries: JSON.parse(r.top_slow_queries || '[]')
        }));
    }
    async runHealthCheck() {
        try {
            const now = Date.now();
            const fiveMinAgo = now - 300000;

            // 1. Error Count (5m)
            const errorCount = (await this.db.get("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?", [fiveMinAgo])).c;

            // Trigger if > 50 errors in 5 min
            if (errorCount > 50) {
                await this.triggerSafeMode(`High Error Rate: ${errorCount} errors in 5m`);
            }
        } catch (e) {
            console.error('[SafeMode] Check failed:', e);
        }
    }

    async triggerSafeMode(reason) {
        try {
            const current = await this.db.get("SELECT value FROM system_flags WHERE key = 'system_state'");
            if (current?.value === 'DEGRADED') return; // Already safe mode

            console.warn(`[SAFE MODE] Triggered: ${reason}`);

            await this.db.query("INSERT OR REPLACE INTO system_flags (key, value, updated_at) VALUES ('system_state', 'DEGRADED', ?)", [Date.now()]);
            await this.db.query("INSERT OR REPLACE INTO system_flags (key, value, updated_at) VALUES ('revenue_mode', 'READONLY', ?)", [Date.now()]);

            // Log incident
            await this.db.query("INSERT INTO incident_bundles (title, severity, status, created_at, updated_at) VALUES (?, 'critical', 'investigating', ?, ?)",
                [`SAFE MODE ENABLED: ${reason}`, Date.now(), Date.now()]);
        } catch (e) {
            console.error('[SafeMode] Failed to trigger:', e);
        }
    }
}
