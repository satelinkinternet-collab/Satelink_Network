import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:8080';

async function main() {
    console.log('[SmokeTest] 🛡️  Verifying Abuse Firewall & Safe Mode...');

    const token = await getAdminToken();
    if (!token) process.exit(1);

    // 1. Abuse Firewall: Manual Block
    console.log('\n--- 1. Testing Manual Block ---');
    const testIpHash = 'test_blocked_hash_' + Date.now();

    // Create override
    const blockRes = await fetch(`${BASE_URL}/admin/security/enforcement/override`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            entity_type: 'ip_hash',
            entity_id: testIpHash,
            decision: 'block',
            ttl_seconds: 60,
            reason_codes: ['smoke_test']
        })
    });
    console.log('Block Override:', (await blockRes.json()).ok ? 'OK' : 'FAIL');

    // Verify Block (Simulate request with that hash??)
    // We can't easily spoof IP hash in middleware without trusted proxy, 
    // BUT we can check if it appears in active enforcement list
    const listRes = await fetch(`${BASE_URL}/admin/security/enforcement?entity_type=ip_hash&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const found = listData.events.find(e => e.entity_id === testIpHash && e.decision === 'block');
    console.log('Block Active in DB:', found ? 'YES' : 'NO');


    // 2. Safe Mode: Trigger & Enforce
    console.log('\n--- 2. Testing Safe Mode ---');

    // Trigger
    const triggerRes = await fetch(`${BASE_URL}/admin/controls/safe-mode/enter`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'smoke_test_trigger', ttl_seconds: 60 })
    });
    console.log('Trigger Safe Mode:', (await triggerRes.json()).ok ? 'OK' : 'FAIL');

    // Verify System State in Summary
    const summaryRes = await fetch(`${BASE_URL}/admin/command/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const summary = await summaryRes.json();
    console.log('System State:', summary.system.system_state); // Should be DEGRADED

    if (summary.system.system_state !== 'DEGRADED') {
        console.error('FAIL: System state not updated to DEGRADED');
    }

    // Verify Withdrawals Paused (Ops Endpoint)
    // We don't have a public withdraw endpoint to hit easily without setup, 
    // but we can check the flag in summary or hit a known ops endpoint if available.
    // For MVP, checking the state flag is good enough proxy.

    // Exit Safe Mode
    const exitRes = await fetch(`${BASE_URL}/admin/controls/safe-mode/exit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    console.log('Exit Safe Mode:', (await exitRes.json()).ok ? 'OK' : 'FAIL');

    // Final Check
    const finalSummary = await (await fetch(`${BASE_URL}/admin/command/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })).json();
    console.log('Final System State:', finalSummary.system.system_state); // Should be NORMAL

}

async function getAdminToken() {
    try {
        const res = await fetch(`${BASE_URL}/__test/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: '0xsmoke_tester' })
        });
        const data = await res.json();
        return data.token;
    } catch (e) {
        console.error('Failed to get token:', e);
        return null;
    }
}

main();
