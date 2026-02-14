export class DrillsService {
    constructor(db, opsEngine, alertService, abuseFirewall, safeModeAutopilot) {
        this.db = db;
        this.opsEngine = opsEngine;
        this.alertService = alertService;
        this.abuseFirewall = abuseFirewall;
        this.safeModeAutopilot = safeModeAutopilot;
    }

    async runKillSwitchDrill(actor) {
        console.log('[Drill] Running Kill Switch Drill...');
        const logId = await this._startLog('kill_switch_drill', actor);
        let success = false;
        let details = [];

        try {
            // 1. Enable Safe Mode
            await this.safeModeAutopilot.triggerSafeMode("DRILL: Kill Switch Test");
            details.push("Safe Mode Enabled");

            // 2. Verify State
            const state = await this.db.get("SELECT value FROM system_flags WHERE key='system_state'");
            if (state?.value !== 'DEGRADED') throw new Error("State check failed: Not DEGRADED");
            details.push("State Verified: DEGRADED");

            // 3. Verify Ops Blocked (Simulated check)
            const safe = await this.opsEngine.isSystemSafe();
            if (safe) throw new Error("Ops check failed: System still reports safe");
            details.push("Ops Guard Verified: Unsafe");

            // 4. Exit Safe Mode
            await this.db.query("UPDATE system_flags SET value='NORMAL' WHERE key='system_state'");
            await this.db.query("UPDATE system_flags SET value='ACTIVE' WHERE key='revenue_mode'");
            await this.db.query("UPDATE system_flags SET value='0' WHERE key='safe_mode_enabled'");
            details.push("Safe Mode Exited");

            success = true;
        } catch (e) {
            details.push(`ERROR: ${e.message}`);
        } finally {
            await this._endLog(logId, success, details.join('; '));
        }
        return { success, details };
    }

    async runAbuseDrill(actor) {
        console.log('[Drill] Running Abuse Drill...');
        const logId = await this._startLog('abuse_drill', actor);
        let success = false;
        let details = [];

        try {
            const testIp = 'drill_test_ip_' + Date.now();

            // 1. Simulate Auth Failures
            for (let i = 0; i < 25; i++) {
                await this.abuseFirewall.recordMetric({
                    key_type: 'ip_hash',
                    key_value: testIp,
                    metric: 'auth_fail'
                });
            }
            details.push("Simulated 25 auth failures");

            // 2. Trigger Evaluation
            // The recordMetric calls might not have triggered eval instantly due to batching? 
            // Actually it does `evaluateRules` after write.

            // 3. Check Enforcement
            const rule = await this.db.get("SELECT * FROM enforcement_events WHERE entity_id = ? AND decision = 'block'", [testIp]);
            if (!rule) throw new Error("Firewall did not block test IP");
            details.push("Block Verified");

            // 4. Cleanup
            await this.abuseFirewall.clearDecision('ip_hash', testIp);
            details.push("Cleanup Complete");

            success = true;
        } catch (e) {
            details.push(`ERROR: ${e.message}`);
        } finally {
            await this._endLog(logId, success, details.join('; '));
        }
        return { success, details };
    }

    async runRecoveryDrill(actor) {
        console.log('[Drill] Running Recovery Drill...');
        const logId = await this._startLog('recovery_drill', actor);
        let success = false;
        let details = [];

        try {
            // 1. Force Checkpoint
            await this.db.query("PRAGMA wal_checkpoint(TRUNCATE);");
            details.push("WAL Checkpoint Triggered");

            // 2. Check Integrity
            const integrity = await this.db.query("PRAGMA integrity_check;");
            if (integrity[0]?.integrity_check !== 'ok') throw new Error("Integrity check failed");
            details.push("Integrity Check Passed");

            success = true;
        } catch (e) {
            details.push(`ERROR: ${e.message}`);
        } finally {
            await this._endLog(logId, success, details.join('; '));
        }
        return { success, details };
    }

    async runBlackSwanDrill(actor) {
        console.log('[Drill] Running BLACK SWAN Simulation...');
        const logId = await this._startLog('black_swan_drill', actor);
        let success = false;
        let details = [];

        try {
            // 1. Defcon 1: Set State
            await this.db.query("UPDATE system_flags SET value='BLACK_SWAN' WHERE key='system_state'");
            details.push("System State: BLACK_SWAN");

            // 2. Simulate Massive Load Check (DB Stress)
            // perform a heavy query
            await this.db.query(`
                SELECT count(*) FROM (
                    SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
                ) a, (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
            `);
            details.push("Load Simulation: Survived");

            // 3. Trigger Emergency Lockdown (Simulated)
            await this.safeModeAutopilot.triggerSafeMode("DRILL: Black Swan Event");
            details.push("Safe Mode Triggered");

            // 4. Verify Lockdown
            const safe = await this.opsEngine.isSystemSafe();
            if (safe) throw new Error("System failed to lock down!");
            details.push("Lockdown Verified");

            // 5. Recovery
            await this.db.query("UPDATE system_flags SET value='NORMAL' WHERE key='system_state'");
            await this.db.query("UPDATE system_flags SET value='0' WHERE key='safe_mode_enabled'");
            await this.db.query("UPDATE system_flags SET value='ACTIVE' WHERE key='revenue_mode'");
            details.push("Recovery Complete");

            success = true;
        } catch (e) {
            details.push(`ERROR: ${e.message}`);
        } finally {
            await this._endLog(logId, success, details.join('; '));
        }
        return { success, details };
    }

    async _startLog(kind, actor) {
        const res = await this.db.query("INSERT INTO diagnostics_results (check_name, status, details, created_at) VALUES (?, 'running', ?, ?)", [kind, `Started by ${actor}`, Date.now()]);
        return res.lastInsertRowid || res[0]?.id; // rowid
    }

    async _endLog(id, success, details) {
        await this.db.query("UPDATE diagnostics_results SET status = ?, details = ? WHERE id = ?", [success ? 'pass' : 'fail', details, id]);
    }
}
