import fs from 'fs';

const BASE_URL = 'http://localhost:8080';

async function main() {
    console.log('[Phase 23/24] 🚩 Verifying Feature Flags & Drills...');
    const token = await getAdminToken();
    if (!token) process.exit(1);

    // 1. Feature Flags
    console.log('\n--- 1. Testing Feature Flags ---');
    const flagKey = 'beta_test_flag_' + Date.now();

    // Create Flag (Whitelist)
    const createRes = await fetch(`${BASE_URL}/admin/settings/flags/${flagKey}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mode: 'WHITELIST',
            whitelist: ['0xallowed'],
            description: 'Smoke test flag'
        })
    });
    console.log('Create Flag:', (await createRes.json()).ok ? 'OK' : 'FAIL');

    // Verify Listings
    const listRes = await fetch(`${BASE_URL}/admin/settings/flags`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const found = listData.flags.find(f => f.key === flagKey);
    console.log('Flag in List:', found ? 'YES' : 'NO');
    if (found) console.log(`  Mode: ${found.mode}, Whitelist: ${JSON.stringify(found.whitelist)}`);


    // 2. Drills
    console.log('\n--- 2. Testing Drills ---');

    // Kill Switch Drill
    console.log('Running Kill Switch Drill...');
    const killRes = await fetch(`${BASE_URL}/admin/drills/kill-switch/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` } // Super admin needed
    });
    const killData = await killRes.json();
    console.log('Kill Switch Drill:', killData.ok ? 'PASS' : `FAIL (${killData.error})`);
    if (killData.ok) console.log('  Details:', killData.result.details);

    // Abuse Drill
    console.log('Running Abuse Drill...');
    const abuseRes = await fetch(`${BASE_URL}/admin/drills/abuse/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const abuseData = await abuseRes.json();
    console.log('Abuse Drill:', abuseData.ok ? 'PASS' : `FAIL (${abuseData.error})`);

    // Recovery Drill
    console.log('Running Recovery Drill...');
    const recRes = await fetch(`${BASE_URL}/admin/drills/recovery/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const recData = await recRes.json();
    console.log('Recovery Drill:', recData.ok ? 'PASS' : `FAIL (${recData.error})`);

}

async function getAdminToken() {
    try {
        const res = await fetch(`${BASE_URL}/__test/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: '0xadmin' }) // Needs super admin for drills
        });
        const data = await res.json();
        return data.token;
    } catch (e) {
        console.error('Failed to get token:', e);
        return null;
    }
}

main();
