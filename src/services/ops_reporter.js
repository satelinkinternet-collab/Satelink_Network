
async function execSql(db, sql, params = []) {
  const raw = (db && db.db) ? db.db : db;

  // Postgres Pool / Client
  if (raw && typeof raw.query === "function") {
    return raw.query(sql, params);
  }

  // SQLite / better-sqlite3 style
  if (raw && typeof raw.exec === "function") {
    return raw.exec(sql);
  }

  // SQLite wrapper styles
  if (raw && typeof raw.run === "function") {
    return raw.run(sql, params);
  }
  if (raw && typeof raw.prepare === "function") {
    return raw.prepare(sql).run(params);
  }

  throw new Error("DB has no query/exec/run/prepare");
}


export class OpsReporter {
    constructor(db) {
        this.db = db;
    }

    init() {
        await execSql(this.db, `
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

    runDailyReport() {
        // Report for last 24h
        const now = Math.floor(Date.now() / 1000);
        const yesterday = now - 86400;

        // Stats
        const errors = this.db.prepare("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?").get([yesterday * 1000]);
        const slowQs = this.db.prepare("SELECT COUNT(*) as c FROM slow_queries WHERE last_seen_at > ?").get([yesterday * 1000]);
        const incidents = this.db.prepare("SELECT COUNT(*) as c FROM incident_bundles WHERE created_at > ?").get([yesterday * 1000]);
        const betaUsers = this.db.prepare("SELECT COUNT(*) as c FROM beta_users WHERE status = 'active'").get([]);
        const invites = this.db.prepare("SELECT COUNT(*) as c FROM beta_invites WHERE status = 'active'").get([]);

        // Top Lists
        const topErrors = this.db.prepare(`
            SELECT service, message, COUNT(*) as count 
            FROM error_events 
            WHERE last_seen_at > ? 
            GROUP BY service, message 
            ORDER BY count DESC LIMIT 5
        `).all([yesterday * 1000]);

        const topSlowQs = this.db.prepare(`
            SELECT sample_sql, AVG(avg_ms) as avg_ms, COUNT(*) as count 
            FROM slow_queries 
            WHERE last_seen_at > ? 
            GROUP BY sample_sql 
            ORDER BY avg_ms DESC LIMIT 5
        `).all([yesterday * 1000]);

        // Insert
        const res = this.db.prepare(`
            INSERT INTO daily_ops_reports 
            (start_ts, end_ts, error_count, slow_query_count, incident_count, beta_user_count, active_invites, top_errors, top_slow_queries, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run([
            yesterday, now,
            errors.c, slowQs.c, incidents.c, betaUsers.c, invites.c,
            JSON.stringify(topErrors), JSON.stringify(topSlowQs),
            now
        ]);

        return { id: res.lastInsertRowid };
    }

    getReports(limit = 10) {
        const reports = this.db.prepare("SELECT * FROM daily_ops_reports ORDER BY created_at DESC LIMIT ?").all([limit]);
        return reports.map(r => ({
            ...r,
            top_errors: JSON.parse(r.top_errors || '[]'),
            top_slow_queries: JSON.parse(r.top_slow_queries || '[]')
        }));
    }

    runHealthCheck() {
        try {
            const now = Date.now();
            const fiveMinAgo = now - 300000;

            // 1. Error Count (5m)
            const errorCount = (this.db.prepare("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?").get([fiveMinAgo])).c;

            // Trigger if > 50 errors in 5 min
            if (errorCount > 50) {
                this.triggerSafeMode(`High Error Rate: ${errorCount} errors in 5m`);
            }
        } catch (e) {
            console.error('[SafeMode] Check failed:', e);
        }
    }

    triggerSafeMode(reason) {
        try {
            const current = this.db.prepare("SELECT value FROM system_flags WHERE key = 'system_state'").get([]);
            if (current?.value === 'DEGRADED') return; // Already safe mode

            console.warn(`[SAFE MODE] Triggered: ${reason}`);

            this.db.prepare("INSERT OR REPLACE INTO system_flags (key, value, updated_at) VALUES ('system_state', 'DEGRADED', ?)").run([Date.now()]);
            this.db.prepare("INSERT OR REPLACE INTO system_flags (key, value, updated_at) VALUES ('revenue_mode', 'READONLY', ?)").run([Date.now()]);

            // Log incident
            this.db.prepare("INSERT INTO incident_bundles (title, severity, status, created_at, updated_at) VALUES (?, 'critical', 'investigating', ?, ?)")
                .run([`SAFE MODE ENABLED: ${reason}`, Date.now(), Date.now()]);
        } catch (e) {
            console.error('[SafeMode] Failed to trigger:', e);
        }
    }
}
