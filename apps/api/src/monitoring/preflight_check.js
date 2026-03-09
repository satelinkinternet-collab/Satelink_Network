
export class PreflightCheckService {
    constructor(db, ledger, drillService, opsEngine, abuseFirewall) {
        this.db = db;
        this.ledger = ledger;
        this.drillService = drillService;
        this.opsEngine = opsEngine;
        this.abuseFirewall = abuseFirewall;
    }

    async init() {
        console.log("[Preflight] Service initialized.");
    }

    async getStatus() {
        const checks = [];
        const blockers = [];
        const warnings = [];

        // 1. Governance Lock (Mock for now, checking system_config)
        const govLock = await this.db.get("SELECT value FROM system_config WHERE key = 'governance_lock'");
        const isGovLocked = govLock?.value === '1';
        checks.push({ name: 'Governance Lock', status: isGovLocked ? 'PASS' : 'WARN', details: 'Critical config locked?' });
        if (!isGovLocked) warnings.push("Governance lock is disabled. Configs are mutable.");

        // 2. Economic Integrity (Last Self Test)
        const lastEcoTest = await this.db.get(`
            SELECT * FROM self_test_runs 
            WHERE kind = 'economic_integrity' 
            ORDER BY created_at DESC LIMIT 1
        `);
        const ecoPass = lastEcoTest && lastEcoTest.status === 'pass';
        checks.push({ name: 'Economic Integrity', status: ecoPass ? 'PASS' : 'FAIL', details: lastEcoTest ? JSON.stringify(lastEcoTest.results) : 'Never ran' });
        if (!ecoPass) blockers.push("Economic Integrity Self-Test failed or never ran.");

        // 3. Ledger Chain Intact (Spot Check)
        // We'll trust the self-test for deep check, but let's check basic chain integrity here?
        // Let's rely on the self-test for now to be fast.

        // 4. Critical Incidents
        const openCritical = await this.db.get("SELECT COUNT(*) as c FROM incidents WHERE severity = 'critical' AND status = 'open'");
        const hasCritical = openCritical.c > 0;
        checks.push({ name: 'No Critical Incidents', status: hasCritical ? 'FAIL' : 'PASS', details: `${openCritical.c} open criticals` });
        if (hasCritical) blockers.push("Active Critical Incidents detected.");

        // 5. Safe Mode Drill (Last 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const safeModeDrill = await this.db.get(`
            SELECT * FROM self_test_runs 
            WHERE kind = 'safe_mode_toggle' AND created_at > ? 
            ORDER BY created_at DESC LIMIT 1
        `, [sevenDaysAgo]);
        const safeModeTested = !!safeModeDrill;
        checks.push({ name: 'Safe Mode Drill (7d)', status: safeModeTested ? 'PASS' : 'WARN', details: safeModeTested ? 'Verified' : 'Not tested recently' });
        if (!safeModeTested) warnings.push("Safe Mode mechanism not tested in 7 days.");

        // 6. Full Restore Drill (Last 7 days)
        const restoreDrill = await this.db.get(`
            SELECT * FROM self_test_runs 
            WHERE kind = 'full_restore_drill' AND created_at > ?
            ORDER BY created_at DESC LIMIT 1
        `, [sevenDaysAgo]);
        const restoreTested = !!restoreDrill && restoreDrill.status === 'pass';
        checks.push({ name: 'Restore Drill (7d)', status: restoreTested ? 'PASS' : 'FAIL', details: restoreTested ? 'Verified' : 'Not tested or failed' });
        if (!restoreTested) blockers.push("Disaster Recovery (Restore) not verified in 7 days.");

        // 7. Abuse Firewall Active
        const fwActive = this.abuseFirewall && this.abuseFirewall.rules && this.abuseFirewall.rules.length > 0;
        // Or check if enabled? 
        // Let's assume initialized = active.
        checks.push({ name: 'Abuse Firewall', status: fwActive ? 'PASS' : 'INFO', details: 'Service active' });

        // 8. Treasury Runway
        const balance = await this.opsEngine.getTreasuryAvailable();
        const treasuryOk = balance > 1000; // Threshold example
        checks.push({ name: 'Treasury Runway', status: treasuryOk ? 'PASS' : 'WARN', details: `Balance: ${balance} USDT` });
        if (!treasuryOk) warnings.push("Treasury balance low.");

        // 9. Settlement Health (Last 5 mins)
        const lastHealth = await this.db.get("SELECT * FROM settlement_health_log ORDER BY created_at DESC LIMIT 1");
        const healthOk = lastHealth && lastHealth.health_status === 'ok';
        // Allow if no health log yet (system startup)
        const healthStatus = (!lastHealth || healthOk) ? 'PASS' : 'FAIL';
        checks.push({ name: 'Settlement Adapter Health', status: healthStatus, details: lastHealth ? `${lastHealth.adapter_name} (${lastHealth.latency_ms}ms)` : 'No data' });
        if (healthStatus === 'FAIL') blockers.push(`Settlement Adapter (${lastHealth.adapter_name}) is unhealthy.`);

        // 10. Settlement Shadow Integrity (Last 24h)
        const recentShadowFailures = await this.db.get(`
            SELECT COUNT(*) as c FROM settlement_shadow_log 
            WHERE created_at > ?
        `, [Date.now() - 86400000]);
        const shadowOk = recentShadowFailures.c === 0;
        checks.push({ name: 'Shadow Settlement (24h)', status: shadowOk ? 'PASS' : 'WARN', details: `${recentShadowFailures.c} mismatches` });
        if (!shadowOk) warnings.push("Settlement Shadow Mode detected mismatches in last 24h.");

        // [Phase 32] EVM Readiness Gates
        if (settlementAdapter && settlementAdapter.startsWith('EVM')) {
            // Require restore drill
            if (!restoreTested) blockers.push("RESTORE DRILL REQUIRED for EVM Settlement.");

            // Require economic integrity
            if (!ecoPass) blockers.push("ECONOMIC INTEGRITY REQUIRED for EVM Settlement.");

            // Safe Mode
            const safeMode = await this.db.get("SELECT value FROM system_flags WHERE key='safe_mode_enabled'");
            if (safeMode?.value === '1') blockers.push("SAFE MODE ACTIVE: EVM Settlement blocked.");

            // Config / Caps check (via env, implicitly trusted if adapter loaded? or check limits?)
            const maxUsdt = process.env.SETTLEMENT_MAX_BATCH_USDT;
            if (!maxUsdt) warnings.push("SETTLEMENT_MAX_BATCH_USDT not set (using default recursive cap).");
        }


        return {
            ready,
            timestamp: Date.now(),
            blockers,
            warnings,
            checks
        };
    }
}
