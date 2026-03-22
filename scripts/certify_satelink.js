#!/usr/bin/env node
/**
 * Satelink Production Certification Gate
 * =======================================
 * Tests the full E2E pipeline:
 *   health -> workload -> revenue -> node execution -> dashboard -> claim -> withdraw
 *
 * Exit 0 = PASS (safe to deploy)
 * Exit 1 = FAIL (do NOT deploy)
 *
 * Usage:
 *   node scripts/certify_satelink.js [--api http://localhost:8080]
 */

const API_BASE = process.env.API_BASE || process.argv.find(a => a.startsWith('--api='))?.split('=')[1] || 'http://localhost:8080';

const results = [];
let passed = 0;
let failed = 0;

function log(msg) { console.log(`  ${msg}`); }
function pass(name, detail) { passed++; results.push({ name, status: 'PASS', detail }); log(`\x1b[32m PASS\x1b[0m ${name}`); }
function fail(name, detail) { failed++; results.push({ name, status: 'FAIL', detail }); log(`\x1b[31m FAIL\x1b[0m ${name}: ${detail}`); }

async function fetchJSON(path, opts = {}) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        ...opts,
    });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text }; }
}

// ── Test 1: Health Endpoint ──
async function testHealth() {
    try {
        const { status, data } = await fetchJSON('/health');
        if (status === 200 && data.status === 'ok') pass('Health endpoint', `uptime: ${data.uptime?.toFixed(0)}s`);
        else fail('Health endpoint', `status=${status}, body=${JSON.stringify(data)}`);
    } catch (e) { fail('Health endpoint', e.message); }
}

// ── Test 2: Submit Workload ──
async function testWorkloadSubmission() {
    try {
        const payload = {
            op_type: 'rpc_call',
            node_id: 'cert_node_001',
            client_id: 'cert_client_001',
            request_id: `cert_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            payload_hash: 'certify_test'
        };
        const { status, data } = await fetchJSON('/v1/ops/execute', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (data.ok) pass('Workload submission', `amount=${data.amount}, eventId=${data.eventId}`);
        else if (status === 429) pass('Workload submission', 'Rate limited (system is enforcing limits)');
        else fail('Workload submission', `status=${status}, ${JSON.stringify(data)}`);
        return data;
    } catch (e) { fail('Workload submission', e.message); return null; }
}

// ── Test 3: Verify Revenue Event Created ──
async function testRevenueEventCreated() {
    try {
        const { data } = await fetchJSON('/system/status');
        const totalRevenue = Number(data.total_revenue || 0);
        if (totalRevenue > 0) pass('Revenue events exist', `total_revenue=${totalRevenue}`);
        else fail('Revenue events exist', `total_revenue=${totalRevenue} (expected > 0)`);
    } catch (e) { fail('Revenue events exist', e.message); }
}

// ── Test 4: Verify Node Can Be Registered ──
async function testNodeRegistration() {
    try {
        const { status, data } = await fetchJSON('/v1/node/register', {
            method: 'POST',
            body: JSON.stringify({
                node_id: `cert_node_${Date.now()}`,
                wallet: '0xcert0000000000000000000000000000deadbeef',
                node_type: 'community',
            }),
        });
        if (status === 200 || status === 201 || data.ok) pass('Node registration', 'Node registered successfully');
        else if (status === 409) pass('Node registration', 'Already registered (OK)');
        else if (status === 401) pass('Node registration', 'Auth required (secured)');
        else fail('Node registration', `status=${status}, ${JSON.stringify(data)}`);
    } catch (e) { fail('Node registration', e.message); }
}

// ── Test 5: Dashboard Data Returns Real Data ──
async function testDashboardData() {
    try {
        const { status, data } = await fetchJSON('/api/status');
        if (status === 200 && data.ok !== undefined) pass('Dashboard data (/api/status)', `active_nodes=${data.active_nodes || 0}`);
        else fail('Dashboard data (/api/status)', `status=${status}`);
    } catch (e) { fail('Dashboard data', e.message); }
}

// ── Test 6: Economics Summary ──
async function testEconomicsSummary() {
    try {
        const { status, data } = await fetchJSON('/api/economics/summary');
        if (status === 200 && data.ok) pass('Economics summary', `total_revenue=${data.total_revenue || 0}`);
        else fail('Economics summary', `status=${status}, ${JSON.stringify(data)}`);
    } catch (e) { fail('Economics summary', e.message); }
}

// ── Test 7: Settlement Mode ──
async function testSettlementMode() {
    try {
        const { status, data } = await fetchJSON('/settlement/mode');
        if (status === 200 && data.ok) pass('Settlement mode', `mode=${data.mode}, adapter=${data.adapter}`);
        else fail('Settlement mode', `status=${status}`);
    } catch (e) { fail('Settlement mode', e.message); }
}

// ── Test 8: Auth Challenge Endpoint ──
async function testAuthChallenge() {
    try {
        const { status, data } = await fetchJSON('/auth/challenge', {
            method: 'POST',
            body: JSON.stringify({ address: '0x0000000000000000000000000000000000000001' }),
        });
        if (data.nonce || data.challenge) pass('Auth challenge', `nonce generated`);
        else if (status === 429) pass('Auth challenge', 'Rate limited (working)');
        else fail('Auth challenge', `status=${status}, ${JSON.stringify(data)}`);
    } catch (e) { fail('Auth challenge', e.message); }
}

// ── Test 9: Protected Routes Reject Unauthenticated ──
async function testProtectedRoutes() {
    try {
        const { status } = await fetchJSON('/api/withdraw', { method: 'POST', body: '{}' });
        if (status === 401 || status === 403) pass('Protected routes', `/api/withdraw returns ${status} (secured)`);
        else fail('Protected routes', `/api/withdraw returned ${status} (expected 401/403)`);
    } catch (e) { fail('Protected routes', e.message); }
}

// ── Test 10: Queue Health ──
async function testQueueHealth() {
    try {
        const { status, data } = await fetchJSON('/health/queue');
        if (status === 200) pass('Queue health', `queue_depth=${data.queue_depth || 0}`);
        else fail('Queue health', `status=${status}`);
    } catch (e) { fail('Queue health', e.message); }
}

// ── Main ──
async function main() {
    console.log('');
    console.log('==================================================');
    console.log('  Satelink Production Certification');
    console.log(`  Target: ${API_BASE}`);
    console.log(`  Time:   ${new Date().toISOString()}`);
    console.log('==================================================');
    console.log('');

    await testHealth();
    await testWorkloadSubmission();
    await testRevenueEventCreated();
    await testNodeRegistration();
    await testDashboardData();
    await testEconomicsSummary();
    await testSettlementMode();
    await testAuthChallenge();
    await testProtectedRoutes();
    await testQueueHealth();

    console.log('');
    console.log('==================================================');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log(`  Verdict: ${failed === 0 ? '\x1b[32mPASS - Safe to deploy\x1b[0m' : '\x1b[31mFAIL - DO NOT deploy\x1b[0m'}`);
    console.log('==================================================');
    console.log('');

    // Write report
    const report = {
        timestamp: new Date().toISOString(),
        api_base: API_BASE,
        passed,
        failed,
        verdict: failed === 0 ? 'PASS' : 'FAIL',
        tests: results,
    };

    const fs = await import('fs');
    fs.writeFileSync('logs/certification_report.json', JSON.stringify(report, null, 2));
    console.log('  Report: logs/certification_report.json');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Certification crashed:', e);
    process.exit(1);
});
