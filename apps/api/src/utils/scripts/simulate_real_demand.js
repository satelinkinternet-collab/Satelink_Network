import 'dotenv/config';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';

const NODE_URL = process.env.NODE_URL || 'http://localhost:8080';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'satelink-admin-secret';

async function log(msg) {
    console.log(`[Simulator] ${msg}`);
}

async function simulate() {
    log('Starting Phase 4 Real Demand Simulation...');

    // 1. Register an Enterprise Client
    log('Registering Enterprise Client (PRO Tier)...');
    const registerRes = await fetch(`${NODE_URL}/enterprise/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            companyName: 'Simulated AI Gateway',
            walletAddress: '0x' + randomUUID().replace(/-/g, ''), // Mock random wallet for simulator
            planType: 'PRO'
        })
    });

    if (!registerRes.ok) {
        throw new Error(`Failed to register: ${await registerRes.text()}`);
    }

    const { client, apiKey } = await registerRes.json();
    log(`Client Registered: ${client.clientId} (Rate: ${client.ratePerOp} USDT/op)`);

    // 2. Pretend an on-chain deposit occurred (We notify backend, assuming the worker verifies or we stub it for simulator)
    log('Simulating a $50.00 USDT deposit...');
    // Real implementation uses the Event watcher. Handled here by direct API or mock if real network is not up.
    // For this simulation, assuming we have a mock insert or just hitting the endpoint
    const depositRes = await fetch(`${NODE_URL}/enterprise/deposit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Enterprise-Key': apiKey,
        },
        body: JSON.stringify({
            txHash: '0xmockdeposit' + Date.now(),
            amount: 50.00
        })
    });

    // In a fully end to end simulation we can't cleanly mock the db from here without direct db access.
    // However, we'll try a few ops. They'll fail with 402 if deposit wasn't actually credited in the DB.

    // 3. Fire Paid Ops
    log('Firing 5 Paid API Gateway Ops...');
    for (let i = 0; i < 5; i++) {
        const opRes = await fetch(`${NODE_URL}/operations/execute`, {
            method: 'POST',
            headers: {
                'X-Enterprise-Key': apiKey,
            }
        });

        if (opRes.status === 402) {
            const data = await opRes.json();
            log(`Operation ${i + 1} Failed: 402 Payment Required - ${data.error}`);
            // Stop simulating if we hit a 402 because the deposit detector needs a real on-chain event
            break;
        } else if (opRes.ok) {
            log(`Operation ${i + 1} Success!`);
        } else {
            log(`Operation ${i + 1} Failed: ${opRes.status}`);
        }
    }

    // 4. Fetch usage
    log('Fetching enterprise usage...');
    const usageRes = await fetch(`${NODE_URL}/enterprise/usage`, {
        headers: {
            'X-Enterprise-Key': apiKey,
        }
    });

    if (usageRes.ok) {
        const data = await usageRes.json();
        log(`Total Cost Generated: $${data.totalCost}`);
    }

    // 5. Check Admin Analytics
    log('Checking Admin Demand Metrics...');
    const metricsRes = await fetch(`${NODE_URL}/api/demand/metrics`, {
        headers: {
            'X-Admin-Key': ADMIN_API_KEY,
        }
    });

    if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        log(`Analytics -> Active Clients: ${metrics.data.active_clients}`);
        log(`Analytics -> 24h Revenue: $${metrics.data.revenue_last_24h}`);
    }

    log('Simulation Complete. Check the admin dashboard!');
}

simulate().catch(err => {
    console.error('[Simulator] Fatal Error:', err);
});
