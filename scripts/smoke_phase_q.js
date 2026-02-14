#!/usr/bin/env node
/**
 * Phase Q Smoke Test — SLA + Multi-tenant Reliability
 * 
 * Tests:
 * 1. Schema exists (7 tables)
 * 2. SLA plans seeded
 * 3. Set limits for a partner → circuit breaker init
 * 4. Error budget calculation
 * 5. Circuit breaker trips at limit
 * 6. Report generation
 * 7. Credit issuance
 */

import { UniversalDB } from '../src/db/index.js';
import { SLAEngine } from '../src/services/sla/sla_engine.js';
import crypto from 'crypto';

const DB_PATH = process.env.DATABASE_URL || './satelink.db';
let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}`);
        failed++;
    }
}

async function run() {
    console.log('=== Phase Q Smoke Test: SLA + Multi-tenant Reliability ===\n');

    const db = new UniversalDB({ type: 'sqlite', connectionString: DB_PATH });
    await db.init();
    const sla = new SLAEngine(db);

    // ─── 1. Schema ────────────────────────────────────────────────
    console.log('[1] Schema Verification');
    const tables = ['sla_plans', 'tenant_limits', 'tenant_sla_daily', 'tenant_op_slo_daily',
        'tenant_circuit_state', 'sla_reports', 'sla_credits'];
    for (const t of tables) {
        const exists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [t]);
        assert(!!exists, `Table ${t} exists`);
    }

    // ─── 2. Plans Seeded ──────────────────────────────────────────
    console.log('\n[2] SLA Plans');
    const plans = await sla.getPlans();
    assert(plans.length >= 4, `${plans.length} plans seeded (free/starter/pro/enterprise)`);
    const pro = plans.find(p => p.id === 'pro');
    assert(pro && pro.target_success_rate === 0.995, 'Pro plan target = 99.5%');

    // ─── 3. Set Limits ────────────────────────────────────────────
    console.log('\n[3] Tenant Limits');
    const testPartnerId = `SMOKE-Q-${Date.now()}`;
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Seed a partner
    await db.query(
        `INSERT INTO partner_registry (partner_id, partner_name, wallet, api_key_hash, status, created_at, rate_limit_per_min)
         VALUES (?, 'SmokeQ Corp', '0xSmokeQ', ?, 'active', ?, 100)`,
        [testPartnerId, keyHash, Date.now()]
    );

    await sla.setLimits(testPartnerId, {
        plan_id: 'pro',
        max_rps: 50,
        max_daily_ops: 5,    // Very low for testing
        max_daily_spend_usdt: 10
    });

    const limits = await sla.getLimits(testPartnerId);
    assert(limits && limits.plan_id === 'pro', 'Limits set with pro plan');
    assert(limits.max_daily_ops === 5, 'Max daily ops = 5');

    // ─── 4. Error Budget ──────────────────────────────────────────
    console.log('\n[4] Error Budget');
    const budget = await sla.getErrorBudget(testPartnerId);
    assert(budget.plan === 'Pro', 'Budget shows Pro plan');
    assert(budget.window_30d.budget_remaining_pct === 100, 'Budget starts at 100% (no ops)');

    // ─── 5. Circuit Breaker ───────────────────────────────────────
    console.log('\n[5] Circuit Breaker');
    let cb = await sla.checkCircuitBreaker(testPartnerId);
    assert(cb.allowed === true, 'Circuit initially closed');

    // Simulate hitting limit
    for (let i = 0; i < 5; i++) {
        await sla.recordExecution(testPartnerId, 1.0);
    }

    cb = await sla.checkCircuitBreaker(testPartnerId);
    assert(cb.allowed === false, 'Circuit trips after max_daily_ops exceeded');
    assert(cb.reason === 'daily_ops_limit', 'Reason: daily_ops_limit');

    // ─── 6. Report Generation ─────────────────────────────────────
    console.log('\n[6] Report Export');
    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const report = await sla.generateMonthlyReport(testPartnerId, monthStr);
    assert(report && report.partner_id === testPartnerId, 'Report generated');
    assert(report.plan === 'Pro', 'Report shows Pro plan');
    assert(typeof report.summary.sla_met === 'boolean', 'Report has sla_met flag');

    // Verify stored
    const stored = await db.get("SELECT * FROM sla_reports WHERE partner_id = ?", [testPartnerId]);
    assert(!!stored, 'Report stored in sla_reports');

    // ─── 7. Simulated Credits ─────────────────────────────────────
    console.log('\n[7] Simulated Credits');
    const credit = await sla.issueCredit(testPartnerId, 5.0, 'SLA breach: test');
    assert(credit && credit.status === 'simulated', 'Credit issued (simulated)');

    const credits = await sla.getCredits(testPartnerId);
    assert(credits.length >= 1, 'Credit visible in list');

    // ─── Cleanup ──────────────────────────────────────────────────
    await db.query("DELETE FROM tenant_circuit_state WHERE partner_id = ?", [testPartnerId]);
    await db.query("DELETE FROM tenant_limits WHERE partner_id = ?", [testPartnerId]);
    await db.query("DELETE FROM sla_reports WHERE partner_id = ?", [testPartnerId]);
    await db.query("DELETE FROM sla_credits WHERE partner_id = ?", [testPartnerId]);
    await db.query("DELETE FROM partner_registry WHERE partner_id = ?", [testPartnerId]);

    // ─── Summary ──────────────────────────────────────────────────
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
    console.log(`${'='.repeat(60)}`);

    if (failed > 0) {
        console.error('\n❌ SOME TESTS FAILED');
        process.exit(1);
    } else {
        console.log('\n✅ ALL TESTS PASSED');
        process.exit(0);
    }
}

run().catch(e => {
    console.error('FATAL:', e);
    process.exit(1);
});
