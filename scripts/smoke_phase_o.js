import { UniversalDB } from '../src/db/index.js';
import { LifecycleManager } from '../src/services/network/lifecycle_manager.js';
import { ethers } from 'ethers';

const db = new UniversalDB({ type: 'sqlite', connectionString: 'satelink.db' });
const lifecycle = new LifecycleManager(db);

async function run() {
    console.log("=== Phase O Smoke Test: Node Lifecycle ===");
    await db.init();

    // 1. O1: Start Setup Session
    const userWallet = "0xUser" + Date.now();
    console.log(`[1] Starting Setup for ${userWallet}...`);
    const session = await lifecycle.startSetupSession(userWallet);
    console.log("   Setup ID:", session.setup_id);
    console.log("   Pairing Code:", session.pairing_code);

    if (!session.pairing_code) throw new Error("O1 Failed: No pairing code");

    // 2. O2: Secure Pairing
    console.log(`[2] Simulating Node Pairing...`);
    const nodeWallet = ethers.Wallet.createRandom();
    const timestamp = Date.now();
    const message = `pair:${session.pairing_code}:${timestamp}`;
    const signature = await nodeWallet.signMessage(message);

    const pairResult = await lifecycle.pairNode({
        node_wallet: nodeWallet.address,
        pairing_code: session.pairing_code,
        signature,
        timestamp
    });

    console.log("   Pair Status:", pairResult.status);
    console.log("   Node ID:", pairResult.node_id);

    // Verify DB
    const ownership = await db.get("SELECT * FROM node_ownership WHERE node_id = ?", [nodeWallet.address]);
    if (!ownership || ownership.owner_wallet !== userWallet) {
        throw new Error("O2 Failed: Ownership mismatch in DB");
    }
    console.log("✅ O1/O2 Setup & Pairing Passed");

    // 3. O3: Diag Upload (High CPU)
    console.log(`[3] Uploading Diagnostic Bundle...`);
    const bundle = {
        version: "1.2.3",
        cpu_load: 95, // High CPU -> should trigger remediation
        disk_free_percent: 50,
        logs: ["Starting node...", "Error: connection failed", "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"] // Secret to redact
    };

    await lifecycle.processDiagBundle(nodeWallet.address, bundle);

    // Verify Redaction
    const storedBundle = await db.get("SELECT bundle_json FROM node_diag_bundles WHERE node_id = ?", [nodeWallet.address]);
    if (storedBundle.bundle_json.includes("0xdeadbeef")) {
        throw new Error("O3 Failed: Secret NOT redacted");
    }
    console.log("✅ O3 Diag Redaction Passed");

    // 4. O4: Remediation
    console.log(`[4] Checking Remediation...`);
    const suggestions = await db.query("SELECT * FROM node_remediation_suggestions WHERE node_id = ?", [nodeWallet.address]);
    if (suggestions.length === 0) throw new Error("O4 Failed: No remediation suggestion generated");

    const cpuSugg = suggestions.find(s => s.severity === 'critical');
    if (!cpuSugg) throw new Error("O4 Failed: Critical CPU suggestion missing");
    console.log("   Suggestion:", JSON.parse(cpuSugg.suggestion_json).reason);
    console.log("✅ O4 Remediation Passed");

    // 5. O5: Release Policy
    console.log(`[5] Release Policy (DB Check)...`);
    const policy = await db.get("SELECT min_version FROM node_release_policy WHERE channel = 'stable'");
    console.log("   Stable Min Version:", policy?.min_version);
    if (!policy) throw new Error("O5 Failed: Default policy missing");
    console.log("✅ O5 Release Policy Passed");

    console.log("=== ALL TESTS PASSED ===");
}

run().catch(e => {
    console.error("❌ Test Failed:", e);
    process.exit(1);
});
