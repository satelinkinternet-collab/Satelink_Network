#!/usr/bin/env node
/**
 * Bootstrap Script: Seed First Workload
 *
 * Sends 100 real JSON-RPC calls through the Satelink /rpc endpoint.
 * This creates real revenue_events in the DB — first proof-of-life for the economic model.
 *
 * IMPORTANT: Run ONLY after S0-007 (billing middleware async fix) is complete.
 * Without that fix, revenue events won't be recorded.
 *
 * Usage: node scripts/bootstrap/seed_first_workload.js
 *
 * Required env vars:
 *   API_URL - Satelink API URL (default: http://localhost:8080)
 *   BOOTSTRAP_API_KEY - API key for authenticated requests (optional)
 */

const API_URL = process.env.API_URL || 'http://localhost:8080';
const API_KEY = process.env.BOOTSTRAP_API_KEY;

const RPC_METHODS = [
    { method: 'eth_blockNumber', params: [] },
    { method: 'eth_chainId', params: [] },
    { method: 'eth_gasPrice', params: [] },
    { method: 'net_version', params: [] },
    { method: 'eth_getBalance', params: ['0x0000000000000000000000000000000000000000', 'latest'] }
];

async function seedWorkload() {
    console.log('🚀 Seeding first workload — 100 RPC calls');
    console.log('   API URL:', API_URL);
    console.log('   Using API key:', API_KEY ? 'yes' : 'no (public tier)');
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < 100; i++) {
        const rpc = RPC_METHODS[i % RPC_METHODS.length];

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (API_KEY) headers['x-api-key'] = API_KEY;

            const res = await fetch(`${API_URL}/v1/workload/rpc/amoy`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: rpc.method,
                    params: rpc.params,
                    id: i + 1
                })
            });

            const data = await res.json();

            if (res.ok && (data.ok || data.result !== undefined)) {
                successCount++;
                if (i % 10 === 0) {
                    console.log(`Call ${i + 1}: ${rpc.method} → OK`);
                }
            } else {
                errorCount++;
                console.log(`Call ${i + 1}: ${rpc.method} → FAIL (${data.error || res.status})`);
            }
        } catch (error) {
            errorCount++;
            console.log(`Call ${i + 1}: ${rpc.method} → ERROR (${error.message})`);
        }

        // 100ms between calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Results:');
    console.log(`    ✅ Success: ${successCount}`);
    console.log(`    ❌ Errors:  ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Next: Check revenue_events table:');
    console.log("  SELECT count(*), sum(amount_usdt) FROM revenue_events WHERE source = 'rpc_request';");
    console.log('');

    if (successCount < 50) {
        console.log('⚠️  Warning: Less than 50% success rate. Check:');
        console.log('   1. Is the API server running?');
        console.log('   2. Is S0-007 (billing async fix) complete?');
        console.log('   3. Are RPC providers configured?');
        process.exit(1);
    }

    console.log('✅ Seed workload complete!');
}

seedWorkload();
