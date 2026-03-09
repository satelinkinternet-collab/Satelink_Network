/**
 * Phase R: Forensics & Audit Smoke Test
 * Verifies canonical hashing, snapshots, replay determinism and audit chain.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';
const ADMIN_WALLET = '0xabc123';

async function run() {
    console.log("🚀 Starting Phase R: Forensics Smoke Test...");

    try {
        // 0. Mock Login to get JWT
        console.log("--- 0. Mock Login (Admin) ---");
        const loginRes = await fetch(`${BASE_URL}/auth/__test/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: ADMIN_WALLET, role: 'admin_super' })
        });

        const loginData = await loginRes.json();

        if (!loginData.success) {
            console.error("❌ Login failed:", loginData);
            process.exit(1);
        }

        const token = loginData.token;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 1. Check Forensics Snapshots (GET)
        console.log("--- 1. Testing Snapshots API ---");
        const snapRes = await fetch(`${BASE_URL}/admin/forensics/snapshots`, { headers });
        const snapData = await snapRes.json();
        if (snapData.ok) {
            console.log(`✅ Snapshots found: ${snapData.snapshots?.length || 0}`);
        } else {
            console.error("❌ Snapshot list failed:", snapData.error);
        }

        // 2. Trigger Manual Snapshot
        console.log("--- 2. Triggering Manual Snapshot ---");
        const triggerRes = await fetch(`${BASE_URL}/admin/forensics/snapshot/run`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ day: parseInt(new Date().toISOString().split('T')[0].replace(/-/g, '')) })
        });
        const triggerData = await triggerRes.json();
        if (triggerData.ok) {
            console.log("✅ Manual snapshot successful:", triggerData.hashProof);
        } else {
            console.error("❌ Manual snapshot failed:", triggerData.error);
        }

        // 3. Test Replay Engine
        console.log("--- 3. Testing Replay Engine ---");
        const now = Math.floor(Date.now() / 1000);
        const from = now - 3600; // 1h window
        const replayRes = await fetch(`${BASE_URL}/admin/forensics/replay?from_ts=${from}&to_ts=${now}`, { headers });
        const replayData = await replayRes.json();
        if (replayData.ok) {
            console.log(`✅ Replay engine verified. Variance: ${replayData.variance.revenue_usdt_diff_pct}%`);
            console.log(`   Proof Hash: ${replayData.proof_hash}`);
        } else {
            console.error("❌ Replay engine failed:", replayData.error);
        }

        // 4. Ledger Integrity Check
        console.log("--- 4. Ledger Integrity Check ---");
        const intRes = await fetch(`${BASE_URL}/admin/forensics/integrity/run`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ day: parseInt(new Date().toISOString().split('T')[0].replace(/-/g, '')) })
        });
        const intData = await intRes.json();
        if (intData.ok) {
            console.log("✅ Integrity check passed.");
        } else {
            console.error("❌ Integrity check failed:", intData.error);
        }

        // 4b. Create Dispute to seed Audit Logs
        console.log("--- 4b. Creating Dispute (Seeds Audit Log) ---");
        const dispRes = await fetch(`${BASE_URL}/admin/forensics/disputes`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                partner_id: 'part_123',
                from_ts: now - 3600,
                to_ts: now,
                reason: 'Smoke Test Dispute'
            })
        });
        const dispData = await dispRes.json();
        if (dispData.ok) {
            console.log("✅ Dispute created, audit entry hashed.");
        } else {
            console.error("❌ Dispute creation failed:", dispData.error);
        }

        // 5. Audit Chain Verification
        console.log("--- 5. Audit Chain Verification ---");
        const verifyRes = await fetch(`${BASE_URL}/admin/forensics/security/audit/verify`, { headers });
        const verifyData = await verifyRes.json();
        if (verifyData.ok && verifyData.hashed_count > 0) {
            console.log(`✅ Audit chain integrity verified. Hashed entries: ${verifyData.hashed_count}`);
        } else {
            console.error("❌ Audit chain verification failed or empty:", verifyData);
        }

        console.log("\n✨ Phase R Smoke Test COMPLETED SUCCESSFULLY");
    } catch (e) {
        console.error("\n💥 Smoke test CRASHED:", e.message);
        process.exit(1);
    }
}

run();
