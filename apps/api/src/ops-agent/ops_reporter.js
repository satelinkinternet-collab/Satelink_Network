
async function execSql(db, sql, params = []) {
    return db.prepare(sql).run(params);
}

export class OpsReporter {
    constructor(db) {
        this.db = db;
    }

    async init() {
        // Tables are typically handled by init.sql in Postgres
        // But we keep this for dynamic runtime insurance if needed
        /*
        try {
            await execSql(this.db, `
                CREATE TABLE IF NOT EXISTS daily_ops_reports (
                    id SERIAL PRIMARY KEY,
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
        } catch (e) { }
        */

        // Phase 22: Safe Mode Autopilot Check
        setInterval(() => this.runHealthCheck(), 60000);
    }

    async runDailyReport() {
        const now = Math.floor(Date.now() / 1000);
        const yesterday = now - 86400;

        const errors = await this.db.prepare("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?").get([yesterday * 1000]);
        const slowQs = await this.db.prepare("SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?").get([yesterday * 1000]);
        const incidents = await this.db.prepare("SELECT COUNT(*) as c FROM incident_bundles WHERE created_at > ?").get([yesterday * 1000]);
        const betaUsers = await this.db.prepare("SELECT COUNT(*) as c FROM beta_users WHERE status = 'active'").get();
        const invites = await this.db.prepare("SELECT COUNT(*) as c FROM beta_invites WHERE status = 'active'").get();

        const topErrors = await this.db.prepare(`
            SELECT service, message, COUNT(*) as count
            FROM error_events
            WHERE last_seen_at > ?
            GROUP BY service, message
            ORDER BY count DESC LIMIT 5
        `).all([yesterday * 1000]);

        const topSlowQs = await this.db.prepare(`
            SELECT sample_sql, AVG(avg_ms) as avg_ms, COUNT(*) as count
            FROM slow_queries
            WHERE last_seen_at > ?
            GROUP BY sample_sql
            ORDER BY avg_ms DESC LIMIT 5
        `).all([yesterday * 1000]);

        const res = await this.db.prepare(`
            INSERT INTO daily_ops_reports
            (start_ts, end_ts, error_count, slow_query_count, incident_count, beta_user_count, active_invites, top_errors, top_slow_queries, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `).all([
            yesterday, now,
            errors.c, slowQs.c, incidents.c, (betaUsers?.c || 0), (invites?.c || 0),
            JSON.stringify(topErrors), JSON.stringify(topSlowQs),
            now
        ]);

        return { id: res[0]?.id };
    }

    async getReports(limit = 10) {
        const reports = await this.db.prepare("SELECT * FROM daily_ops_reports ORDER BY created_at DESC LIMIT ?").all([limit]);
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

            const errorCountRes = await this.db.prepare("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?").get([fiveMinAgo]);
            const errorCount = errorCountRes?.c || 0;

            if (errorCount > 50) {
                await this.triggerSafeMode(`High Error Rate: ${errorCount} errors in 5m`);
            }
        } catch (e) {
            console.error('[SafeMode] Check failed:', e);
        }
    }

    async triggerSafeMode(reason) {
        try {
            const current = await this.db.prepare("SELECT value FROM system_flags WHERE key = 'system_state'").get();
            if (current?.value === 'DEGRADED') return;

            console.warn(`[SAFE MODE] Triggered: ${reason}`);

            await this.db.prepare(`
                INSERT INTO system_flags (key, value, updated_at) VALUES ('system_state', 'DEGRADED', ?)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
            `).run([Date.now()]);

            await this.db.prepare(`
                INSERT INTO system_flags (key, value, updated_at) VALUES ('revenue_mode', 'READONLY', ?)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
            `).run([Date.now()]);

            await this.db.prepare("INSERT INTO incident_bundles (title, severity, status, created_at, updated_at) VALUES (?, 'critical', 'investigating', ?, ?)").run(
                [`SAFE MODE ENABLED: ${reason}`, Date.now(), Date.now()]);
        } catch (e) {
            console.error('[SafeMode] Failed to trigger:', e);
        }
    }
}
