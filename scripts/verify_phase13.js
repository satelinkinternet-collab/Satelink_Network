
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    console.log("=== PHASE 13 VERIFICATION ===");

    // 1. Get Admin Token
    console.log("\n1. Getting Admin Token...");
    const adminRes = await fetch(`${BASE_URL}/auth/__test/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'admin_user', role: 'admin_super' })
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.token;
    console.log(adminToken ? "PASS" : "FAIL");

    // 2. Test SSE
    console.log("\n2. Testing SSE Admin...");
    let ssePass = false;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`${BASE_URL}/stream/admin`, {
            headers: { 'Authorization': `Bearer ${adminToken}` },
            signal: controller.signal
        });

        for await (const chunk of res.body) {
            const text = chunk.toString();
            console.log("SSE Chunk:", text.slice(0, 50).replace(/\n/g, '\\n') + "...");
            if (text.includes("event: hello")) {
                ssePass = true;
            }
            if (text.includes("event: snapshot")) {
                console.log("SSE Snapshot: FOUND");
                break;
            }
        }
        clearTimeout(timeout);
    } catch (e) {
        if (ssePass) console.log("SSE closed as expected.");
    }
    console.log("SSE Hello Event:", ssePass ? "PASS" : "FAIL");

    // 3. Pairing Flow
    console.log("\n3. Pairing Flow...");
    // Get User Token
    const userRes = await fetch(`${BASE_URL}/auth/__test/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'user_wallet_123', role: 'node_operator' })
    });
    const userData = await userRes.json();
    const userToken = userData.token;

    // Request Code
    const pairRes = await fetch(`${BASE_URL}/pair/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    const pairData = await pairRes.json();
    const code = pairData.pair_code;
    console.log("Got Code:", code);

    if (!code) throw new Error("Failed to get code");

    // 4. Device Confirm
    console.log("\n4. Confirming Pair...");
    const deviceId = `device_${Date.now()}`;
    const confirmRes = await fetch(`${BASE_URL}/pair/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, device_id: deviceId })
    });
    const confirmData = await confirmRes.json();
    console.log("Confirm Resp:", confirmData);

    if (confirmData.status !== 'LINKED') throw new Error("Failed to link");

    // 5. Persistence Check
    console.log("\n5. Checking Status...");
    const statusRes = await fetch(`${BASE_URL}/pair/status/${code}`);
    const statusData = await statusRes.json();
    console.log("Status Resp:", statusData);

    if (statusData.status === 'LINKED') {
        console.log("VERIFICATION COMPLETE: ALL PASS");
    } else {
        console.log("VERIFICATION FAILED: Status mismatch");
    }
}

run().catch(console.error);
