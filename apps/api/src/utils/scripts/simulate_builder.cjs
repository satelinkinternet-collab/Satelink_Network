
const { ethers } = require('ethers');
const crypto = require('crypto');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8080';

async function run() {
    console.log("=== Builder Algo Simulation ===");

    // 1. Setup Wallet
    const wallet = ethers.Wallet.createRandom();
    const address = await wallet.getAddress();
    console.log(`[1] Created Builder Wallet: ${address}`);

    // 2. Auth Challenge
    const cRes = await fetch(`${BASE_URL}/auth/builder/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address })
    });
    const { nonce } = await cRes.json();
    console.log(`[2] Challenge Nonce: ${nonce}`);

    // 3. Sign & Verify
    const msg = `Sign to login to Satelink Builder Console.\nNonce: ${nonce}`;
    const signature = await wallet.signMessage(msg);

    const vRes = await fetch(`${BASE_URL}/auth/builder/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, signature })
    });

    const cookie = vRes.headers.get('set-cookie');
    if (!cookie) throw new Error("Verification failed (No Cookie)");
    console.log(`[3] Authenticated. Session Cookie: ${cookie.split(';')[0]}`);

    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookie
    };

    // 4. Create Project
    await fetch(`${BASE_URL}/builder/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Simulated DeFi App' })
    });
    console.log(`[4] Project Created`);

    // 5. Get Project ID
    const pRes = await fetch(`${BASE_URL}/builder/projects`, { headers });
    const projects = await pRes.json();
    const projectId = projects[0].id;
    console.log(`[5] Project ID: ${projectId}`);

    // 6. Create API Key
    const kRes = await fetch(`${BASE_URL}/builder/projects/${projectId}/keys`, { method: 'POST', headers });
    const { key } = await kRes.json();
    console.log(`[6] API Key Created: ${key}`);

    // 7. Send Usage
    const uRes = await fetch(`${BASE_URL}/v1/builder/usage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key
        },
        body: JSON.stringify({
            endpoint: 'sim/test',
            qty: 5,
            unit_price_usdt: 0.10,
            payer_wallet: '0xUserPayer...',
            meta: { sim: true }
        })
    });
    const uData = await uRes.json();
    console.log(`[7] Usage Ingested: ${JSON.stringify(uData)}`);

    console.log("=== Simulation Complete ===");
}

run().catch(console.error);
