/**
 * Retention Cleaner - Keeps the DB lean and fast
 * 
 * Prunes old data from high-volume tables to prevent unbounded growth.
 * Scheduled to run daily (or more frequent in high-load envs).
 * 
 * Retention Policy:
 * - request_traces: 7 days
 * - error_events: 30 days
 * - slow_queries: 30 days
 * - self_test_runs: 30 days
 * - incident_bundles: 90 days (resolved)
 * - security_alerts: 90 days
 */

export class RetentionCleaner {
    constructor(db) {
        this.db = db;
    }

    async run() {
        console.log('[Retention] Starting cleanup job...');
        const start = Date.now();
        const stats = {
            traces_removed: 0,
            errors_removed: 0,
            slow_queries_removed: 0,
            test_runs_removed: 0,
            incidents_removed: 0,
            alerts_removed: 0
        };

        try {
            // 1. Traces (Heavy volume) - 7 days
            const traceCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const traceRes = await this.db.query(
                `DELETE FROM request_traces WHERE created_at < ? RETURNING 1`,
                [traceCutoff]
            );
            stats.traces_removed = traceRes.length || 0;

            // Refined approach for SQLite compatibility
            await this._prune('request_traces', 'created_at', traceCutoff, 'traces_removed', stats);

            // 2. Errors - 30 days
            const errorCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
            await this._prune('error_events', 'last_seen_at', errorCutoff, 'errors_removed', stats);

            // 3. Slow Queries - 30 days
            await this._prune('slow_queries', 'last_seen_at', errorCutoff, 'slow_queries_removed', stats);

            // 4. Self Tests - 30 days
            await this._prune('self_test_runs', 'created_at', errorCutoff, 'test_runs_removed', stats);

            // 4b. Runtime Metrics - 7 days
            await this._prune('runtime_metrics', 'created_at', traceCutoff, 'runtime_metrics_removed', stats);

            // 4c. Backup Logs - 90 days
            const backupCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
            await this._prune('backup_log', 'created_at', backupCutoff, 'backup_logs_removed', stats);

            // 5. Incidents - 90 days (if not open)
            const incidentCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
            // Only prune resolved/sent incidents, keep open ones forever until handled
            const incRes = await this.db.query(
                `DELETE FROM incident_bundles WHERE created_at < ? AND status != 'open'`,
                [incidentCutoff]
            );
            // Manually update stats if wrapper returns array
            if (Array.isArray(incRes)) stats.incidents_removed = incRes.length;

            // 6. Security Alerts - 90 days
            await this._prune('security_alerts', 'created_at', incidentCutoff, 'alerts_removed', stats);

            const duration = Date.now() - start;
            console.log(`[Retention] cleanup complete in ${duration}ms`, stats);

            // Log to audit (as system)
            try {
                await this.db.query(`
                    INSERT INTO admin_audit_log (actor_wallet, action_type, target_type, target_id, before_json, after_json, ip_hash, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    'system',
                    'RETENTION_CLEANUP',
                    'system',
                    'db_maintenance',
                    null,
                    JSON.stringify({ stats, duration_ms: duration }),
                    'system',
                    Date.now()
                ]);
            } catch (e) {
                console.error('[Retention] Failed to log audit:', e.message);
            }

            return stats;

        } catch (e) {
            console.error('[Retention] Job failed:', e.message);
            return stats;
        }
    }

    async _prune(table, timeCol, cutoff, statKey, statsObj) {
        try {
            await this.db.query(`DELETE FROM ${table} WHERE ${timeCol} < ?`, [cutoff]);
            statsObj[statKey] = 'executed';
        } catch (e) {
            console.error(`[Retention] Failed to prune ${table}:`, e.message);
            statsObj[statKey] = 'failed';
        }
    }
}
