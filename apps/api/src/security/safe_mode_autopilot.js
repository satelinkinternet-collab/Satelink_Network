import { OpsReporter } from '../ops-agent/ops_reporter.js';

export class SafeModeAutopilot {
    constructor(db, alertService) {
        this.db = db;
        this.alertService = alertService;
        this.checks = {
            errors_5m: 0,
            p95_latency_5m: 0,
            wal_size: 0,
            sse_health: 'unknown'
        };
        // Thresholds
        this.THRESHOLDS = {
            errors_5m: 50, // > 50 errors in 5m
            p95_latency_5m: 2000, // > 2s P95
            wal_size_mb: 512, // > 512MB WAL
        };
        // Consecutive counter
        this.triggers = {
            errors: 0,
            latency: 0,
            wal: 0
        };
    }

    async init(isTest = false) {
        // Tables system_flags, diagnostics_results handled by init.sql
        /*
        await this.db.prepare(`
            CREATE TABLE IF NOT EXISTS system_flags (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at BIGINT
            )
        `).run();
        await this.db.prepare(`
            CREATE TABLE IF NOT EXISTS diagnostics_results (
                id SERIAL PRIMARY KEY,
                check_name TEXT,
                status TEXT,
                created_at BIGINT
            )
        `).run();
        */
        await this.db.prepare("INSERT INTO system_flags (key, value, updated_at) VALUES ('safe_mode_enabled', '0', ?) ON CONFLICT (key) DO NOTHING").run([Date.now()]);
        await this.db.prepare("INSERT INTO system_flags (key, value, updated_at) VALUES ('system_state', 'NORMAL', ?) ON CONFLICT (key) DO NOTHING").run([Date.now()]);
        await this.db.prepare("INSERT INTO system_flags (key, value, updated_at) VALUES ('revenue_mode', 'ACTIVE', ?) ON CONFLICT (key) DO NOTHING").run([Date.now()]);
        
        console.log('[SafeMode] Autopilot initialized.');
        if (!isTest) setInterval(() => this.runCheck(), 60000); // Check every minute
    }

    async runCheck() {
        try {
            const now = Date.now();
            const fiveMinAgo = now - 300000;

            // 1. Error Count (5m)
            const errorRes = await this.db.prepare("SELECT COUNT(*) as c FROM error_events WHERE last_seen_at > ?").get([fiveMinAgo]);
            this.checks.errors_5m = errorRes?.c || 0;

            // 2. Latency P95 (5m)
            const slowRes = await this.db.prepare("SELECT COUNT(*) as c FROM request_traces WHERE duration_ms > 2000 AND created_at > ?").get([fiveMinAgo]);
            const slowCount = slowRes?.c || 0;

            // 3. WAL Size (Placeholder for Postgres)
            this.checks.wal_size = 0;

            // 4. SSE Health check (from diagnostics table)
            const diag = await this.db.prepare("SELECT status FROM diagnostics_results WHERE check_name='sse_health' ORDER BY created_at DESC LIMIT 1").get();
            this.checks.sse_health = diag?.status || 'unknown';

            // --- EVALUATE ---
            let triggered = false;
            let reasons = [];

            if (this.checks.errors_5m >= this.THRESHOLDS.errors_5m) {
                this.triggers.errors++;
                if (this.triggers.errors >= 2) {
                    triggered = true;
                    reasons.push(`High Error Rate (${this.checks.errors_5m}/5m)`);
                }
            } else {
                this.triggers.errors = 0;
            }

            if (slowCount > 50) {
                this.triggers.latency++;
                if (this.triggers.latency >= 2) {
                    triggered = true;
                    reasons.push(`High Latency (${slowCount} slow reqs/5m)`);
                }
            } else {
                this.triggers.latency = 0;
            }

            if (triggered) {
                await this.triggerSafeMode(reasons.join(', '));
            }

        } catch (e) {
            console.error('[SafeMode] Check failed:', e);
        }
    }

    async triggerSafeMode(reason) {
        // Idempotency: check if already enabled
        const current = await this.db.prepare("SELECT value FROM system_flags WHERE key='safe_mode_enabled'").get();
        if (current?.value === '1') return; // Already on

        console.warn(`[SAFE MODE] TRIGGERED: ${reason}`);
        const now = Date.now();
        const until = now + (30 * 60 * 1000); // 30 mins

        // PostgreSQL transactional updates
        await this.db.prepare("UPDATE system_flags SET value='1', updated_at=? WHERE key='safe_mode_enabled'").run([now]);
        await this.db.prepare("UPDATE system_flags SET value='DEGRADED', updated_at=? WHERE key='system_state'").run([now]);
        await this.db.prepare("UPDATE system_flags SET value='READONLY', updated_at=? WHERE key='revenue_mode'").run([now]);
        
        await this.db.prepare(`
            INSERT INTO system_flags (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
        `).run([ 'safe_mode_reason', reason, now]);

        await this.db.prepare(`
            INSERT INTO system_flags (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
        `).run(['safe_mode_until', String(until), now]);

        // Alert
        if (this.alertService) {
            this.alertService.createAlert({
                type: 'infra_safemode',
                severity: 'critical',
                title: `Safe Mode Enabled: ${reason}`,
                source_ip: 'system'
            });
        }
    }
}
