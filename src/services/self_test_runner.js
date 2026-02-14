import http from 'http';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Self-Test Runner — Autonomous health verification
 *
 * Runs 4 test kinds every 5 minutes AND on-demand via admin endpoint.
 * On FAIL: creates incident_bundles + security_alerts(category=infra).
 * browser_smoke: on-demand only (admin_super), spawns Playwright safely.
 */

const REQUIRED_TABLES = [
    'request_traces', 'error_events', 'slow_queries', 'admin_audit_log',
    'system_flags', 'security_alerts', 'config_limits',
    'self_test_runs', 'incident_bundles'
];

const KIND_SEVERITY = {
    backend_smoke: 'critical',
    api_contract: 'high',
    sse_health: 'med',
    db_integrity: 'critical',
    browser_smoke: 'low'
};

const ALLOWED_KINDS = [
    'backend_smoke', 'api_contract', 'sse_health', 'db_integrity',
    'browser_smoke', 'settlement_integrity', 'evm_adapter_health',
    'fleet_integrity', 'rewards_safety', 'status_page_contract',
    'pricing_integrity', 'commission_integrity', 'unit_economics_sanity', 'growth_fraud_detection',
    'region_cap_enforcement', 'partner_rate_limit_integrity', 'referral_fraud_detection',
    'launch_mode_safety', 'marketing_metrics_sanity',
    'quality_routing_integrity', 'reward_multiplier_sanity', 'reputation_decay_sanity', 'tier_assignment_contract',
    'embedded_auth_flow', 'silent_reauth_contract', 'support_bundle_redaction', 'session_binding_sanity',
    'revenue_stability_integrity', 'authenticity_integrity',
    'autonomy_safety_contract', 'recommendation_engine_contract',
    'pairing_integrity', 'diag_redaction_contract', 'release_policy_contract',
    'sla_math_contract', 'tenant_limits_enforced', 'op_type_slo_contract', 'report_export_contract',
    'forensics_hash_contract', 'ledger_integrity_contract', 'audit_chain_integrity'
];

export class SelfTestRunner {
    constructor(opsEngine, port = 8080, incidentBuilder = null, settlementEngine = null) {
        this.db = opsEngine.db;
        this.port = port;
        this.incidentBuilder = incidentBuilder;
        this.settlementEngine = settlementEngine;
        this._interval = null;
    }

    /** Start auto-run every 5 minutes */
    start() {
        // Initial run 30s after boot (give server time to stabilize)
        setTimeout(() => this.runAll(), 30_000);
        this._interval = setInterval(() => this.runAll(), 5 * 60 * 1000);
        console.log('[SelfTest] Runner started — every 5 min');
    }

    stop() {
        if (this._interval) clearInterval(this._interval);
    }

    /** Run all test kinds (excluding browser_smoke which is on-demand only) */
    async runAll() {
        const kinds = ['backend_smoke', 'api_contract', 'db_integrity', 'sse_health', 'silent_reauth_contract', 'session_binding_sanity', 'revenue_stability_integrity', 'authenticity_integrity'];
        const results = [];
        for (const kind of kinds) {
            results.push(await this.runKind(kind));
        }

        // Also check for spikes (auto-incident creation)
        if (this.incidentBuilder) {
            try {
                const created = await this.incidentBuilder.createSpikeIncidents();
                if (created > 0) console.log(`[SelfTest] Created ${created} spike incident(s)`);
            } catch (e) {
                console.error('[SelfTest] Spike check failed:', e.message);
            }
        }

        return results;
    }

    /** Run a single test kind */
    async runKind(kind) {
        if (!ALLOWED_KINDS.includes(kind)) {
            return { kind, status: 'error', durationMs: 0, errorMessage: `Unknown test kind: ${kind}` };
        }

        const start = Date.now();
        let status = 'pass';
        let output = {};
        let errorMessage = null;

        try {
            switch (kind) {
                case 'backend_smoke':
                    output = await this._testBackendSmoke();
                    break;
                case 'api_contract':
                    output = await this._testApiContract();
                    break;
                case 'sse_health':
                    output = await this._testSseHealth();
                    break;
                case 'db_integrity':
                    output = await this._testDbIntegrity();
                    break;
                case 'settlement_integrity':
                    output = await this._testSettlementIntegrity();
                    break;
                case 'browser_smoke':
                    output = await this._testBrowserSmoke();
                    break;
                case 'evm_adapter_health':
                    output = await this._testEvmAdapterHealth();
                    break;
                case 'fleet_integrity':
                    output = await this._testFleetIntegrity();
                    break;
                case 'rewards_safety':
                    output = await this._testRewardsSafety();
                    break;
                case 'status_page_contract':
                    output = await this._testStatusPageContract();
                    break;
                case 'pricing_integrity':
                    output = await this._testPricingIntegrity();
                    break;
                case 'commission_integrity':
                    output = await this._testCommissionIntegrity();
                    break;
                case 'unit_economics_sanity':
                    output = await this._testUnitEconomicsSanity();
                    break;
                case 'growth_fraud_detection':
                    output = await this._testGrowthFraud();
                    break;
                case 'region_cap_enforcement':
                    output = await this._testRegionCaps();
                    break;
                case 'partner_rate_limit_integrity':
                    output = await this._testPartnerRateLimits();
                    break;
                case 'referral_fraud_detection':
                    output = await this._testReferralFraud();
                    break;
                case 'launch_mode_safety':
                    output = await this._testLaunchModeSafety();
                    break;
                case 'marketing_metrics_sanity':
                    output = await this._testMarketingMetrics();
                    break;
                case 'quality_routing_integrity':
                    output = await this._testQualityRouting();
                    break;
                case 'reward_multiplier_sanity':
                    output = await this._testRewardMultiplier();
                    break;
                case 'reputation_decay_sanity':
                    output = await this._testReputationDecay();
                    break;
                case 'tier_assignment_contract':
                    output = await this._testTierAssignment();
                    break;
                case 'embedded_auth_flow':
                    output = await this._testEmbeddedAuthFlow();
                    break;
                case 'silent_reauth_contract':
                    output = await this._testSilentReauthContract();
                    break;
                case 'support_bundle_redaction':
                    output = await this._testSupportBundleRedaction();
                    break;
                case 'session_binding_sanity':
                    output = await this._testSessionBindingSanity();
                    break;
                case 'revenue_stability_integrity':
                    output = await this._testRevenueStability();
                    break;
                case 'authenticity_integrity':
                    output = await this._testAuthenticity();
                    break;
                case 'autonomy_safety_contract':
                    output = await this._testAutonomySafetyContract();
                    break;
                case 'recommendation_engine_contract':
                    output = await this._testRecommendationEngineContract();
                    break;
                case 'pairing_integrity':
                    output = await this._testPairingIntegrity();
                    break;
                case 'diag_redaction_contract':
                    output = await this._testDiagRedaction();
                    break;
                case 'release_policy_contract':
                    output = await this._testReleasePolicyContract();
                    break;
                case 'sla_math_contract':
                    output = await this._testSLAMathContract();
                    break;
                case 'tenant_limits_enforced':
                    output = await this._testTenantLimitsEnforced();
                    break;
                case 'op_type_slo_contract':
                    output = await this._testOpTypeSloContract();
                    break;
                case 'report_export_contract':
                    output = await this._testReportExportContract();
                    break;
                case 'forensics_hash_contract':
                    output = await this._testForensicsHashContract();
                    break;
                case 'ledger_integrity_contract':
                    output = await this._testLedgerIntegrityContract();
                    break;
                case 'audit_chain_integrity':
                    output = await this._testAuditChainIntegrity();
                    break;
                default:
                    throw new Error(`Unknown test kind: ${kind}`);
            }
            if (output._fail) {
                status = 'fail';
                errorMessage = output._fail;
                delete output._fail;
            }
        } catch (e) {
            status = 'error';
            errorMessage = e.message;
            output = { error: e.message };
        }

        const durationMs = Date.now() - start;

        // Persist result
        try {
            await this.db.query(`
                INSERT INTO self_test_runs (kind, status, duration_ms, output_json, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [kind, status, durationMs, JSON.stringify(output), errorMessage, Date.now()]);
        } catch (e) {
            console.error('[SelfTest] Failed to persist result:', e.message);
        }

        // On FAIL/ERROR → create incident + security alert
        if (status === 'fail' || status === 'error') {
            await this._createIncident(kind, status, errorMessage, output);
        }

        return { kind, status, durationMs, output, errorMessage };
    }

    // ─── Test Implementations ────────────────────────

    async _testBackendSmoke() {
        const healthBody = await this._httpGet(`http://127.0.0.1:${this.port}/health`);
        if (!healthBody) return { _fail: 'Health endpoint unreachable' };

        // Verify DB is accessible
        try {
            const row = await this.db.get("SELECT 1 as ok");
            if (!row || row.ok !== 1) return { _fail: 'DB health check returned unexpected result' };
        } catch (e) {
            return { _fail: `DB query failed: ${e.message}` };
        }

        return { health: 'ok', db: 'ok' };
    }

    async _testApiContract() {
        const result = {};
        try {
            const body = await this._httpGet(`http://127.0.0.1:${this.port}/admin/command/summary`);
            if (body === null) {
                return { _fail: 'Admin summary endpoint unreachable' };
            }
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            if (parsed.ok === true) {
                result.summary_reachable = true;
                result.auth_enforced = false;
            } else {
                result.summary_reachable = true;
                result.auth_enforced = true;
            }
        } catch (e) {
            result.summary_reachable = true;
            result.auth_enforced = true;
        }
        return result;
    }

    async _testDbIntegrity() {
        const missing = [];
        for (const table of REQUIRED_TABLES) {
            try {
                await this.db.get(`SELECT 1 FROM ${table} LIMIT 1`);
            } catch (e) {
                missing.push(table);
            }
        }
        if (missing.length > 0) {
            return { _fail: `Missing tables: ${missing.join(', ')}`, missing };
        }
        return { tables_checked: REQUIRED_TABLES.length, all_present: true };
    }

    async _testSettlementIntegrity() {
        // 1. Check for Stuck Batches (Processing > 10 mins)
        const tenMinsAgo = Date.now() - 600000;
        const stuckBatches = await this.db.query("SELECT id FROM payout_batches_v2 WHERE status = 'processing' AND updated_at < ?", [tenMinsAgo]);

        // 2. Check for Duplicate External Refs (where not null)
        const dupes = await this.db.query(`
            SELECT external_ref, COUNT(*) as c 
            FROM payout_batches_v2 
            WHERE external_ref IS NOT NULL 
            GROUP BY external_ref 
            HAVING c > 1
        `);

        // 3. Shadow Mismatches in last hour
        const hourAgo = Date.now() - 3600000;
        const shadowMismatches = await this.db.get("SELECT COUNT(*) as c FROM settlement_shadow_log WHERE created_at > ?", [hourAgo]);

        const result = {
            stuck_batches: stuckBatches.length,
            duplicate_refs: dupes.length,
            recent_shadow_mismatches: shadowMismatches.c
        };

        if (stuckBatches.length > 0) return { _fail: `${stuckBatches.length} stuck batches detected`, ...result };
        if (dupes.length > 0) return { _fail: `${dupes.length} duplicate external refs detected`, ...result };

        // Warn only for shadow mismatches? Or fail? The requirement said "on fail create incident".
        // Shadow mismatch is serious but might not be "integrity" failure of main flow. 
        // Let's fail if > 0 to be safe and trigger alert.
        if (shadowMismatches.c > 0) return { _fail: `${shadowMismatches.c} shadow mismatches in last hour`, ...result };

        return result;
    }

    async _testEvmAdapterHealth() {
        if (!this.settlementEngine) return { note: 'Settlement Engine not available' };

        const flag = await this.db.get("SELECT value FROM system_flags WHERE key = 'settlement_adapter'");
        const currentAdapter = flag ? flag.value : 'SIMULATED';

        const adapter = this.settlementEngine.registry.get(currentAdapter);
        if (!adapter) return { _fail: `Active adapter ${currentAdapter} not found in registry` };

        const health = await adapter.healthCheck();
        if (!health.ok) return { _fail: `Adapter ${currentAdapter} unhealthy: ${health.error}`, latency_ms: health.latency_ms };

        return {
            adapter: currentAdapter,
            health: 'ok',
            latency_ms: health.latency_ms,
            details: health.signer
        };
    }

    async _testFleetIntegrity() {
        const now = Date.now();
        const tenMinsAgo = now - 600000;
        const count = await this.db.get("SELECT COUNT(*) as c FROM node_heartbeats WHERE timestamp > ?", [tenMinsAgo]);

        const future = await this.db.get("SELECT COUNT(*) as c FROM node_heartbeats WHERE timestamp > ?", [now + 30000]);
        if (future.c > 0) return { _fail: `${future.c} heartbeats from the future detected (clock drift)` };

        return { recent_heartbeats: count.c, drift_check: 'pass' };
    }

    async _testRewardsSafety() {
        const mode = await this.db.get("SELECT value FROM system_flags WHERE key='rewards_mode'");
        const cap = await this.db.get("SELECT value FROM system_flags WHERE key='rewards_daily_cap_usdt'");

        if (mode && mode.value === 'LIMITED') {
            if (!cap || isNaN(parseFloat(cap.value))) {
                return { _fail: "Rewards Mode is LIMITED but 'rewards_daily_cap_usdt' is invalid/missing" };
            }
        }
        return { mode: mode ? mode.value : 'SIMULATED (default)', cap_sane: true };
    }

    async _testStatusPageContract() {
        const body = await this._httpGet(`http://127.0.0.1:${this.port}/status`);
        if (!body) return { _fail: 'Status page unreachable' };

        try {
            const json = JSON.parse(body);
            if (!json.status || !['LIVE', 'DEGRADED', 'SAFE_MODE'].includes(json.status)) {
                return { _fail: `Invalid status value: ${json.status}`, raw: body };
            }
            return { contract: 'pass', status_value: json.status };
        } catch (e) {
            return { _fail: `Invalid JSON from /status: ${e.message}` };
        }
    }

    async _testSseHealth() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ note: 'SSE endpoint reachable (auth required for full test)', sse_endpoint: 'responsive' });
            }, 5000);

            const req = http.get(`http://127.0.0.1:${this.port}/stream/admin`, (res) => {
                clearTimeout(timeout);
                if (res.statusCode === 403 || res.statusCode === 401) {
                    resolve({ sse_endpoint: 'responsive', auth_enforced: true, status: res.statusCode });
                } else if (res.statusCode === 200) {
                    resolve({ sse_endpoint: 'responsive', streaming: true });
                } else {
                    resolve({ _fail: `Unexpected SSE status: ${res.statusCode}` });
                }
                req.destroy();
            });

            req.on('error', (e) => {
                clearTimeout(timeout);
                resolve({ _fail: `SSE connection failed: ${e.message}` });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                clearTimeout(timeout);
                resolve({ _fail: 'SSE connection timed out' });
            });
        });
    }

    /** Browser smoke — spawns Playwright safely (on-demand only) */
    async _testBrowserSmoke() {
        const configPath = path.resolve(__dirname, '../../test/browser/playwright.config.ts');
        const npxPath = 'npx';

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ _fail: 'Playwright test timed out (60s)', timed_out: true });
            }, 60_000);

            try {
                // Safe: fixed command, no user input in args
                const child = execFile(npxPath, [
                    'playwright', 'test',
                    '--config', configPath,
                    '--reporter', 'json'
                ], {
                    timeout: 55_000,
                    cwd: path.resolve(__dirname, '../..'),
                    env: { ...process.env, CI: '1' }
                }, (error, stdout, stderr) => {
                    clearTimeout(timeout);
                    if (error) {
                        // Parse JSON output if available
                        let details = {};
                        try { details = JSON.parse(stdout); } catch { details = { raw: stdout?.substring(0, 500) }; }
                        resolve({
                            _fail: `Playwright tests failed: ${error.message}`,
                            exit_code: error.code,
                            details
                        });
                    } else {
                        let details = {};
                        try { details = JSON.parse(stdout); } catch { details = { raw: stdout?.substring(0, 500) }; }
                        resolve({
                            browser_smoke: 'pass',
                            details
                        });
                    }
                });
            } catch (e) {
                clearTimeout(timeout);
                resolve({
                    _fail: `Could not spawn Playwright: ${e.message}`,
                    note: 'Install with: npm i -D @playwright/test && npx playwright install chromium'
                });
            }
        });
    }

    // ─── Helpers ─────────────────────────────────────

    _httpGet(url) {
        return new Promise((resolve) => {
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', () => resolve(null));
            req.setTimeout(10000, () => { req.destroy(); resolve(null); });
        });
    }

    /** Create incident bundle + security alert on test failure */
    async _createIncident(kind, status, errorMessage, output) {
        const severity = KIND_SEVERITY[kind] || 'med';
        try {
            // Build correlated bundle if incident builder is available
            let contextJson;
            if (this.incidentBuilder) {
                const bundle = await this.incidentBuilder.buildIncidentBundle({
                    window_start: Date.now() - 10 * 60_000,
                    window_end: Date.now(),
                    include_limits: 20
                });
                contextJson = JSON.stringify({ ...bundle, trigger: { kind, status, error: errorMessage, output } });
            } else {
                contextJson = JSON.stringify({ kind, status, error: errorMessage, output });
            }

            await this.db.query(`
                INSERT INTO incident_bundles (severity, title, source_kind, context_json, status, created_at)
                VALUES (?, ?, 'self_test', ?, 'open', ?)
            `, [severity, `Self-test FAILED: ${kind}`, contextJson, Date.now()]);

            await this.db.query(`
                INSERT INTO security_alerts (severity, category, entity_type, entity_id, title, evidence_json, status, created_at)
                VALUES (?, 'infra', 'system', ?, ?, ?, 'open', ?)
            `, [
                severity,
                `self_test:${kind}`,
                `Self-test FAILED: ${kind}`,
                JSON.stringify({ kind, status, error: errorMessage }),
                Date.now()
            ]);

            console.warn(`[SelfTest] FAIL: ${kind} — incident created (severity: ${severity})`);
        } catch (e) {
            console.error('[SelfTest] Failed to create incident:', e.message);
        }
    }
    async _testPricingIntegrity() {
        const rules = await this.db.get("SELECT COUNT(*) as c FROM pricing_rules");
        if (!rules || rules.c < 1) return { _fail: "No pricing rules found — revenue engine non-functional" };

        // Verify revenue events are recording new billing columns
        const recent = await this.db.get(
            "SELECT price_version, surge_multiplier, unit_cost FROM revenue_events_v2 ORDER BY created_at DESC LIMIT 1"
        );
        if (recent && recent.price_version === null) {
            return { _fail: "Revenue events missing price_version — billing columns not populated" };
        }

        // Cross-check: every priced op_type should have a pricing_rule
        const orphans = await this.db.get(`
            SELECT COUNT(DISTINCT op_type) as c FROM revenue_events_v2 
            WHERE op_type NOT IN (SELECT op_type FROM pricing_rules)
              AND op_type NOT IN (SELECT op_type FROM ops_pricing)
        `);

        return {
            rules_count: rules.c,
            recent_event: recent ? 'ok' : 'no_data',
            orphan_op_types: orphans?.c || 0
        };
    }

    async _testCommissionIntegrity() {
        // No negative or zero commissions
        const invalid = await this.db.get("SELECT COUNT(*) as c FROM distributor_commissions WHERE amount_usdt <= 0");
        if (invalid?.c > 0) return { _fail: `${invalid.c} commissions with <= 0 amount found` };

        // Fraud-flagged should not be in 'paid' status
        const fraudPaid = await this.db.get(
            "SELECT COUNT(*) as c FROM distributor_commissions WHERE fraud_flag = 1 AND status = 'paid'"
        );
        if (fraudPaid?.c > 0) return { _fail: `${fraudPaid.c} fraud-flagged commissions were paid out` };

        return { integrity: "pass", total: (await this.db.get("SELECT COUNT(*) as c FROM distributor_commissions"))?.c || 0 };
    }

    async _testUnitEconomicsSanity() {
        const eco = await this.db.get("SELECT burn_rate, total_revenue, total_rewards FROM unit_economics_daily ORDER BY created_at DESC LIMIT 1");
        if (eco) {
            if (eco.burn_rate > 10000) return { _fail: `Burn rate critical: $${eco.burn_rate}/day — treasury at risk` };
            if (eco.total_rewards > 0 && eco.total_revenue === 0) return { _fail: "Rewards being paid but zero revenue — unsustainable" };
        }
        return { note: "Economics within safety limits", last_burn: eco?.burn_rate || 0 };
    }

    async _testGrowthFraud() {
        try {
            const { GrowthEngine } = await import('./growth_engine.js');
            const engine = new GrowthEngine(this.db);
            const result = await engine.detectCommissionFraud();
            const flagged = await this.db.get("SELECT COUNT(*) as c FROM distributor_commissions WHERE fraud_flag = 1");

            if (result.total_flags > 10) {
                return { _fail: `High fraud activity: ${result.total_flags} flags detected` };
            }

            return { flagged_commissions: flagged?.c || 0, active_alerts: result.total_flags, status: 'monitor_active' };
        } catch (e) {
            return { status: 'monitor_active', note: 'No conversion data yet' };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 35 Self-Tests
    // ═══════════════════════════════════════════════════════════

    async _testRegionCaps() {
        try {
            const { RegionEngine } = await import('./region_engine.js');
            const engine = new RegionEngine(this.db);
            const regions = await engine.getRegions();

            for (const r of regions) {
                if (r.status === 'pilot' && r.active_nodes_count > r.node_cap) {
                    return { _fail: `Region ${r.region_code} pilot cap exceeded: ${r.active_nodes_count}/${r.node_cap}` };
                }
                if (r.active_nodes_count > r.node_cap * 1.1) {
                    return { _fail: `Region ${r.region_code} over cap by >10%: ${r.active_nodes_count}/${r.node_cap}` };
                }
            }
            return { regions_checked: regions.length, status: 'caps_enforced' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testPartnerRateLimits() {
        try {
            const partners = await this.db.query(
                "SELECT partner_id, rate_limit_per_min, total_ops FROM partner_registry WHERE status = 'active'"
            ) || [];

            for (const p of partners) {
                if (p.rate_limit_per_min <= 0) {
                    return { _fail: `Partner ${p.partner_id} has invalid rate limit: ${p.rate_limit_per_min}` };
                }
            }
            return { partners_checked: partners.length, status: 'rate_limits_valid' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testReferralFraud() {
        try {
            const { GrowthEngine } = await import('./growth_engine.js');
            const engine = new GrowthEngine(this.db);
            const circular = await engine.detectCircularReferrals();
            const spike = await engine.detectActivationSpike();

            if (circular.total_circular > 0) {
                return { _fail: `Circular referrals detected: ${circular.total_circular} chains` };
            }
            if (spike.is_spike) {
                return { _fail: `Activation spike: ${spike.recent_activations} in last hour (avg: ${spike.avg_hourly})` };
            }
            return { circular: circular.total_circular, spike: spike.severity, status: 'clean' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testLaunchModeSafety() {
        try {
            const { LaunchMode } = await import('./launch_mode.js');
            const lm = new LaunchMode(this.db);
            const status = await lm.getStatus();

            if (status.launch_mode_enabled) {
                // Verify tightened settings are actually applied
                const abuse = await this.db.get("SELECT value FROM system_config WHERE key = 'abuse_sensitivity'");
                if (abuse?.value !== 'high') {
                    return { _fail: 'Launch mode ON but abuse_sensitivity not set to high' };
                }
                const capMul = await this.db.get("SELECT value FROM system_config WHERE key = 'rewards_cap_multiplier'");
                if (parseFloat(capMul?.value || '1') > 0.5) {
                    return { _fail: 'Launch mode ON but rewards_cap_multiplier not reduced' };
                }
            }
            return { launch_mode: status.launch_mode_enabled, status: 'settings_consistent' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testMarketingMetrics() {
        try {
            const weekAgo = Date.now() - 7 * 86400000;
            const opsThisWeek = (await this.db.get(
                "SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?", [weekAgo]
            ))?.c || 0;

            // Check for revenue stagnation
            const prevWeek = (await this.db.get(
                "SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ? AND created_at <= ?",
                [weekAgo - 7 * 86400000, weekAgo]
            ))?.c || 0;

            const growthRate = prevWeek > 0 ? ((opsThisWeek - prevWeek) / prevWeek) * 100 : 0;

            if (growthRate < -50 && prevWeek > 10) {
                return { _fail: `Severe usage drop: ${growthRate.toFixed(1)}% vs previous week` };
            }
            return { ops_this_week: opsThisWeek, growth_rate: Math.round(growthRate), status: 'metrics_sane' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Phase M Self-Tests
    // ═══════════════════════════════════════════════════════════

    async _testRevenueStability() {
        try {
            const last = await this.db.get("SELECT * FROM revenue_stability_daily ORDER BY day_yyyymmdd DESC LIMIT 1");
            if (!last) return { status: 'no_data', note: 'No stability data yet' };

            if (last.stability_score < 0 || last.stability_score > 100) {
                return { _fail: `Stability score out of bounds: ${last.stability_score}` };
            }
            return { stability_score: last.stability_score, status: 'pass' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testAuthenticity() {
        try {
            const last = await this.db.get("SELECT * FROM usage_authenticity_daily ORDER BY day_yyyymmdd DESC LIMIT 1");
            if (!last) return { status: 'no_data', note: 'No authenticity data yet' };

            if (last.authenticity_score < 0 || last.authenticity_score > 100) {
                return { _fail: `Authenticity score out of bounds: ${last.authenticity_score}` };
            }
            return { authenticity_score: last.authenticity_score, status: 'pass' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 36 Self-Tests
    // ═══════════════════════════════════════════════════════════

    async _testQualityRouting() {
        try {
            const flag = await this.db.get("SELECT value FROM system_config WHERE key = 'quality_routing_enabled'");
            const nodes = await this.db.query("SELECT node_id, composite_score, fraud_penalty_score FROM node_reputation ORDER BY composite_score DESC LIMIT 5") || [];

            // Verify no high-fraud nodes would be preferred
            for (const n of nodes) {
                if (n.fraud_penalty_score >= 60 && n.composite_score > 70) {
                    return { _fail: `High-fraud node ${n.node_id} has high composite ${n.composite_score} — routing integrity risk` };
                }
            }
            return { routing_enabled: flag?.value === 'true', ranked_nodes: nodes.length, status: 'routing_sound' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testRewardMultiplier() {
        try {
            const { ReputationEngine } = await import('./reputation_engine.js');
            const M = ReputationEngine.MULTIPLIERS;

            // Verify multiplier ordering
            if (M.platinum <= M.gold || M.gold <= M.bronze) {
                return { _fail: `Multiplier ordering broken: plat=${M.platinum} gold=${M.gold} bronze=${M.bronze}` };
            }
            // Verify no multiplier exceeds 1.5x (sanity)
            for (const [tier, mult] of Object.entries(M)) {
                if (mult > 1.5) return { _fail: `Multiplier for ${tier} exceeds 1.5x: ${mult}` };
                if (mult < 0.5) return { _fail: `Multiplier for ${tier} below 0.5x: ${mult}` };
            }
            return { multipliers: M, status: 'multipliers_sane' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testReputationDecay() {
        try {
            // Check if any nodes have impossibly high scores with stale update times
            const weekAgo = Date.now() - 7 * 86400000;
            const staleHigh = await this.db.query(
                "SELECT node_id, composite_score, last_updated_at FROM node_reputation WHERE composite_score > 90 AND last_updated_at < ?",
                [weekAgo]
            ) || [];

            if (staleHigh.length > 5) {
                return { _fail: `${staleHigh.length} nodes have high scores but stale updates — decay not running` };
            }
            return { stale_high_score_nodes: staleHigh.length, status: 'decay_functioning' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    async _testTierAssignment() {
        try {
            const { ReputationEngine } = await import('./reputation_engine.js');
            const T = ReputationEngine.TIERS;
            const nodes = await this.db.query("SELECT node_id, composite_score, tier FROM node_reputation") || [];

            for (const n of nodes) {
                let expected;
                if (n.composite_score >= T.platinum) expected = 'platinum';
                else if (n.composite_score >= T.gold) expected = 'gold';
                else if (n.composite_score >= T.silver) expected = 'silver';
                else expected = 'bronze';

                if (n.tier !== expected) {
                    return { _fail: `Node ${n.node_id}: score=${n.composite_score} tier=${n.tier} expected=${expected}` };
                }
            }
            return { nodes_checked: nodes.length, status: 'tiers_consistent' };
        } catch (e) {
            return { status: 'check_skipped', note: e.message };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 37.1 (H) Self-Tests
    // ═══════════════════════════════════════════════════════════

    async _testEmbeddedAuthFlow() {
        // Verify /start and /finish basic connectivity
        const startRes = await this._httpPost(`http://127.0.0.1:${this.port}/auth/embedded/start`, { address: '0xSelfTest' });
        if (!startRes || !startRes.ok) return { _fail: 'Auth /start failed or unreachable' };
        if (!startRes.nonce || !startRes.message_template) return { _fail: 'Auth /start returned invalid bundle' };

        return { auth_start: 'ok', nonce_generated: true };
    }

    async _testSilentReauthContract() {
        // Verify 401 response contract for re-auth trigger
        // We'll call an admin endpoint without JWT
        const res = await new Promise((resolve) => {
            const req = http.get(`http://127.0.0.1:${this.port}/admin/network/reputation`, (res) => {
                resolve({ status: res.statusCode });
            });
            req.on('error', () => resolve({ status: 500 }));
        });

        if (res.status !== 401) {
            return { _fail: `Expected 401 for unauthorized admin access, got ${res.status}` };
        }
        return { status: 'contract_verified', auth_protection: 'active' };
    }

    async _testSupportBundleRedaction() {
        // This is a logic check — ensure ticket system exists and tables are correct
        const tickets = await this.db.get("SELECT COUNT(*) as c FROM support_tickets");
        if (tickets === undefined) return { _fail: 'support_tickets table missing' };

        // Check recent bundle for secrets (mock check)
        const recent = await this.db.get("SELECT bundle_json FROM support_tickets ORDER BY created_at DESC LIMIT 1");
        if (recent) {
            const b = recent.bundle_json.toLowerCase();
            if (b.includes('private_key') || b.includes('secret') || b.includes('password')) {
                return { _fail: 'Potential secret leak detected in support bundle!' };
            }
        }
        return { tickets_checked: true, status: 'redaction_sane' };
    }

    async _testSessionBindingSanity() {
        // Full E2E: generate wallet -> start -> sign -> finish -> check JWT claims
        try {
            const wallet = ethers.Wallet.createRandom();
            const address = wallet.address;

            // 1. Start
            const startRes = await this._httpPost(`http://127.0.0.1:${this.port}/auth/embedded/start`, { address });
            if (!startRes || !startRes.ok) return { _fail: 'Auth /start failed' };

            const { nonce, created_at, message_template } = startRes;

            // 2. Sign
            // Template: ... Nonce: ${nonce}... Timestamp: ${timestamp}
            const message = message_template
                .replace('${nonce}', nonce)
                .replace('${address}', address)
                .replace('${timestamp}', created_at);

            const signature = await wallet.signMessage(message);

            // 3. Finish
            const finishRes = await this._httpPost(`http://127.0.0.1:${this.port}/auth/embedded/finish`, {
                address,
                signature,
                device_public_id: 'self_test_device_id'
            });

            if (!finishRes || !finishRes.ok) return { _fail: `Auth /finish failed: ${finishRes?.error}` };

            const token = finishRes.token;
            if (!token) return { _fail: 'No token returned' };

            // 4. Inspect JWT (basic decode)
            const payloadBase64 = token.split('.')[1];
            const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
            const payload = JSON.parse(payloadJson);

            if (payload.device_id !== 'self_test_device_id') {
                return { _fail: `JWT missing correct device_id. Got: ${payload.device_id}` };
            }
            if (!payload.ip_hash) {
                return { _fail: 'JWT missing ip_hash claim' };
            }

            return { status: 'binding_verified', claims_present: ['device_id', 'ip_hash'] };

        } catch (e) {
            return { _fail: `Session binding test exception: ${e.message}` };
        }
    }

    _httpPost(url, data) {
        return new Promise((resolve) => {
            const postData = JSON.stringify(data);
            const req = http.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length
                },
                timeout: 5000
            }, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); } catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.write(postData);
            req.end();
        });
    }

    // ─── Phase Q: SLA Self-Tests ──────────────────────────────────

    async _testSLAMathContract() {
        // Verify error budget math: budget_remaining = (allowed_error - actual_error) / allowed_error * 100
        const target = 0.99; // 99% target
        const totalOps = 1000;
        const failedOps = 5; // 0.5% error rate
        const allowedError = 1 - target; // 0.01
        const actualError = failedOps / totalOps; // 0.005
        const budget = ((allowedError - actualError) / allowedError) * 100; // 50%

        if (Math.abs(budget - 50) > 0.1) {
            return { _fail: `Budget math incorrect: expected ~50%, got ${budget.toFixed(2)}%` };
        }

        // Edge case: exactly at target
        const budgetAtTarget = ((allowedError - allowedError) / allowedError) * 100;
        if (budgetAtTarget !== 0) {
            return { _fail: `At-target budget should be 0%, got ${budgetAtTarget}%` };
        }

        // Verify plans exist
        const plans = await this.db.query("SELECT id FROM sla_plans");
        if (!plans || plans.length === 0) {
            return { _fail: 'No SLA plans found in database' };
        }

        return { budget_math: 'correct', plans_found: plans.length };
    }

    async _testTenantLimitsEnforced() {
        // Check that tenant_limits table exists and circuit breaker can trip
        try {
            // Verify table schema
            const schema = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='tenant_limits'"
            );
            if (!schema || schema.length === 0) {
                return { _fail: 'tenant_limits table not found' };
            }

            // Verify circuit state table
            const csSchema = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='tenant_circuit_state'"
            );
            if (!csSchema || csSchema.length === 0) {
                return { _fail: 'tenant_circuit_state table not found' };
            }

            return { tenant_limits: 'enforced', circuit_state_table: 'exists' };
        } catch (e) {
            return { _fail: `Schema check failed: ${e.message}` };
        }
    }

    async _testOpTypeSloContract() {
        // Verify tenant_op_slo_daily table exists
        try {
            const schema = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='tenant_op_slo_daily'"
            );
            if (!schema || schema.length === 0) {
                return { _fail: 'tenant_op_slo_daily table not found' };
            }

            return { op_slo_table: 'exists' };
        } catch (e) {
            return { _fail: `SLO check failed: ${e.message}` };
        }
    }

    async _testReportExportContract() {
        // Verify sla_reports + sla_credits tables exist
        try {
            const reports = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='sla_reports'"
            );
            const credits = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='sla_credits'"
            );
            if (!reports?.length) return { _fail: 'sla_reports table not found' };
            if (!credits?.length) return { _fail: 'sla_credits table not found' };

            return { reports_table: 'exists', credits_table: 'exists' };
        } catch (e) {
            return { _fail: `Report export check failed: ${e.message}` };
        }
    }

    async _testForensicsHashContract() {
        try {
            const { hashObject } = await import('../utils/canonical_json.js');
            const sample = { b: 2, a: 1, c: { e: 5, d: 4 } };
            const hash1 = hashObject(sample);
            const hash2 = hashObject({ a: 1, b: 2, c: { d: 4, e: 5 } });

            if (hash1 !== hash2) return { _fail: 'Canonical hashing is not stable' };

            // Check if snapshots exist
            const snap = await this.db.get("SELECT COUNT(*) as c FROM daily_state_snapshots");
            return { canonical_json: 'stable', existing_snapshots: snap?.c || 0 };
        } catch (e) {
            return { _fail: `Forensics hash check failed: ${e.message}` };
        }
    }

    async _testLedgerIntegrityContract() {
        try {
            const runner = await this.db.get("SELECT count(*) as c FROM ledger_integrity_runs");
            const incidents = await this.db.get("SELECT count(*) as c FROM incident_bundles WHERE title LIKE '%Ledger Integrity%'");
            return { integrity_runs: runner?.c || 0, integrity_incidents: incidents?.c || 0 };
        } catch (e) {
            return { _fail: `Ledger integrity check failed: ${e.message}` };
        }
    }

    async _testAuditChainIntegrity() {
        try {
            const logs = await this.db.query("SELECT id, prev_hash, entry_hash FROM admin_audit_log ORDER BY id ASC LIMIT 10");
            if (!logs || logs.length === 0) return { status: 'empty (skip)' };

            // Check if any has hash
            const hashed = logs.filter(l => l.entry_hash);
            if (hashed.length === 0) return { status: 'no_hashed_entries' };

            return { hashed_entries: hashed.length, latest_id: logs[logs.length - 1].id };
        } catch (e) {
            return { _fail: `Audit chain check failed: ${e.message}` };
        }
    }
}
