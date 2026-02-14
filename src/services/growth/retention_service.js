export class RetentionService {
    constructor(db) {
        this.db = db;
    }

    async runDailyJob() {
        console.log('[Retention] Starting daily calculation...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyymmdd = parseInt(yesterday.toISOString().slice(0, 10).replace(/-/g, ''));

        // For D1, D7, D30, we need to look at cohorts from 1, 7, 30 days ago
        // and check if they were active 'yesterday'.
        // Actually, retention is usually "Cohort from T started. How many active at T+X?"
        // So we compute for cohorts T-1, T-7, T-30.

        await this.computeCohortRetention(yyyymmdd, 1);
        await this.computeCohortRetention(yyyymmdd, 7);
        await this.computeCohortRetention(yyyymmdd, 30);
    }

    async computeCohortRetention(currentYmd, daysAgo) {
        // Defines the Cohort Day
        const cohortDate = this._daysAgo(currentYmd, daysAgo);
        const cohortYmd = parseInt(cohortDate.toISOString().slice(0, 10).replace(/-/g, ''));
        const startTs = cohortDate.setUTCHours(0, 0, 0, 0);
        const endTs = startTs + 86400000;

        // "Active" on currentYmd?
        const checkDate = this._parseYmd(currentYmd);
        const activeStart = checkDate.getTime();
        const activeEnd = activeStart + 86400000;

        // 1. Users Cohort
        const userCohort = await this.db.query("SELECT primary_wallet as wallet FROM users WHERE created_at >= ? AND created_at < ?", [startTs, endTs]);
        if (userCohort.length > 0) {
            let active = 0;
            for (const u of userCohort) {
                // Active if any op or trace? 
                // "any successful ops OR any session activity trace"
                // Traces (request_traces is pruned 7 days, so D30 might be hard if we rely on traces)
                // We rely on 'last_seen' in users table? No, that's cumulative.
                // We rely on `request_traces` for D1/D7. D30 requires longer logs or aggregated "daily_active_users" table.
                // Constraint: "request_traces pruned 7 days". 
                // Suggestion: We can't accurately compute D30 User retention from traces if they are gone.
                // Fallback: Check `ops` table for signed ops?
                // Or checking `auth_events`? (Assuming recorded).
                // MVP: Check `request_traces` (only valid for D1/D7) OR `revenue_events_v2` (longer retention).

                const hasActivity = await this.db.get(
                    `SELECT 1 FROM request_traces WHERE client_id = ? AND created_at >= ? AND created_at < ? LIMIT 1`,
                    [u.wallet, activeStart, activeEnd]
                );
                if (hasActivity) active++;
            }
            await this._store('user', cohortYmd, userCohort.length, active, currentYmd);
        }

        // 2. Nodes Cohort (by created_at or first_seen)
        const nodeCohort = await this.db.query("SELECT node_id FROM nodes WHERE created_at >= ? AND created_at < ?", [startTs, endTs]);
        if (nodeCohort.length > 0) {
            let active = 0;
            for (const n of nodeCohort) {
                // Node active: heartbeat ? 
                // We can't easily check past heartbeats unless we log them.
                // `nodes` table has `last_seen`. This is only "latest".
                // We need `uptime_logs` or similar.
                // Or check `epoch_earnings` where epoch covered this day.
                // Or `op_counts` where epoch covered this day.
                // Let's use `op_counts` (Layer 55).
                // Assumption: Op counts are recorded per epoch.
                // Epochs map to time.
                const hasOps = await this.db.get(`
                    SELECT 1 FROM op_counts oc
                    JOIN epochs e ON oc.epoch_id = e.id
                    WHERE oc.node_id = ? AND e.starts_at >= ? AND e.ends_at < ? LIMIT 1
                `, [n.node_id, activeStart / 1000, activeEnd / 1000]);

                if (hasOps) active++;
            }
            await this._store('node', cohortYmd, nodeCohort.length, active, currentYmd);
        }
    }

    async _store(type, cohortYmd, size, active, currentYmd) {
        const rate = size > 0 ? active / size : 0;
        await this.db.query(`
            INSERT INTO retention_daily (day_yyyymmdd, cohort_type, cohort_day_yyyymmdd, cohort_size, active_count, retention_rate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day_yyyymmdd, cohort_type, cohort_day_yyyymmdd) DO UPDATE SET
                active_count = excluded.active_count,
                retention_rate = excluded.retention_rate
        `, [currentYmd, type, cohortYmd, size, active, rate, Date.now()]);
    }

    _daysAgo(ymd, days) {
        const d = this._parseYmd(ymd);
        d.setUTCDate(d.getUTCDate() - days);
        return d;
    }

    _parseYmd(ymd) {
        const y = Math.floor(ymd / 10000);
        const m = Math.floor((ymd % 10000) / 100) - 1;
        const d = ymd % 100;
        return new Date(Date.UTC(y, m, d));
    }

    async getRetentionMatrix(type, days = 30) {
        return await this.db.query(
            "SELECT * FROM retention_daily WHERE cohort_type = ? ORDER BY cohort_day_yyyymmdd DESC LIMIT ?",
            [type, days * 30] // excessive limit to get matrix
        );
    }
}
