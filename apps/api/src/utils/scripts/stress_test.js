import crypto from 'crypto';
import "dotenv/config";

const SECRET = process.env.MOONPAY_WEBHOOK_SECRET || 'test_secret_abc'; // Fallback for test validity
const BASE_URL = "http://localhost:8080";

async function sendMoonPay(payload, signature) {
    const body = JSON.stringify(payload);
    const sig = signature || crypto.createHmac('sha256', SECRET).update(body).digest('hex'); // Raw/Hex mode for 5B per Rung 3
    // Note: server.js middleware checks for rawBody? 
    // Wait, in previous rung, signature failure was "Invalid Moonpay Signature".
    // Checking code: `verifyMoonPay` uses `req.rawBody`.
    // Checking Rung 4 log: "Status: 401" "Invalid Moonpay Signature"
    // The previous failure was due to ENV not loading SECRET.

    try {
        const res = await fetch(`${BASE_URL}/webhooks/moonpay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Moonpay-Signature-V2': sig // Assuming V2 header
            },
            body: body
        });
        return res;
    } catch (e) {
        return { ok: false, status: 500, error: e.message };
    }
}

async function sendFuse(payload) {
    try {
        const res = await fetch(`${BASE_URL}/webhooks/fuse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res;
    } catch (e) {
        return { ok: false, status: 500, error: e.message };
    }
}

async function manualRevenue(amount) {
    try {
        const res = await fetch(`${BASE_URL}/integrations/manual/revenue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': 'admin-secret'
            },
            body: JSON.stringify({
                amount_usdt: amount,
                payer_wallet: "0xConcurrentTest",
                source_type: "manual_stress"
            })
        });
        return res;
    } catch (e) {
        return { ok: false, status: 500, error: e.message };
    }
}

async function run() {
    const mode = process.argv[2];

    if (mode === 'replay_moonpay') {
        console.log("Starting MoonPay Replay Storm (10x)...");
        const eventId = `mp_stress_${Date.now()}`;
        const payload = {
            id: eventId,
            type: "transaction_created",
            data: {
                id: `tx_${Date.now()}`,
                baseCurrencyAmount: 5,
                walletAddress: "0xStressTest",
                externalCustomerId: "cust_stress"
            }
        };

        const promises = [];
        for (let i = 0; i < 10; i++) promises.push(sendMoonPay(payload));
        const results = await Promise.all(promises);
        const statues = results.map(r => r.status);
        console.log("Statuses:", statues);
    }

    else if (mode === 'replay_fuse') {
        console.log("Starting Fuse Replay Storm (10x)...");
        const txHash = `0xstressfuse_${Date.now()}`;
        const payload = {
            txHash: txHash,
            to: "0x1111111111111111111111111111111111111111", // Router
            from: "0xUserCombined",
            value: "10.0",
            tokenAddress: "0xUSDT"
        };

        const promises = [];
        for (let i = 0; i < 10; i++) promises.push(sendFuse(payload));
        const results = await Promise.all(promises);
        const statues = results.map(r => r.status);
        console.log("Statuses:", statues);
    }

    else if (mode === 'malformed') {
        console.log("Testing Malformed Payloads...");

        // 1. Empty JSON
        const res1 = await fetch(`${BASE_URL}/webhooks/moonpay`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
        console.log(`Empty JSON: ${res1.status}`);

        // 2. Bad Sig
        const res2 = await sendMoonPay({ id: 'bad_sig' }, 'bad_signature');
        console.log(`Bad Sig: ${res2.status}`);

        // 3. Missing Fields (Valid Sig, Invalid Data)
        // Note: verifyMoonPay might pass if rawBody matches sig, but logic fail later?
        // Let's try correct sig for empty payload
        // Actually sendMoonPay calculates sig for the payload passed.
        const res3 = await sendMoonPay({ id: 'valid_sig_no_data' });
        console.log(`Valid Sig No Data: ${res3.status}`); // Should be 400 or handled gracefully
    }

    else if (mode === 'concurrency') {
        console.log("Starting Concurrency Test (20x Manual Revenue)...");
        const amount = 1.5;
        const promises = [];
        for (let i = 0; i < 20; i++) promises.push(manualRevenue(amount));
        const results = await Promise.all(promises);
        const statues = results.map(r => r.status);
        console.log("Statuses:", statues);
        const success = statues.filter(s => s === 200).length;
        console.log(`Success: ${success}/20`);
    }

    else {
        console.log("Usage: node stress_test.js [replay_moonpay|replay_fuse|malformed|concurrency]");
    }
}

run();
