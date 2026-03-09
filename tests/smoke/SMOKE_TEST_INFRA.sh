#!/bin/bash
# SMOKE_TEST_INFRA.sh
# Verifies 10% Infra Reserve Deduction for Managed Nodes

echo "🔥 Starting Infra Reserve Test..."

# 1. Run Node Script to Finalize Epoch with Mock Data
node -e '
  (async () => {
    const { UniversalDB } = await import("./src/db/index.js");
    const { OperationsEngine } = await import("./src/services/operations-engine.js");
    
    // FIX: Explictly set sqlite type
    const db = new UniversalDB({ type: "sqlite", connectionString: "./satelink.db" });
    const ops = new OperationsEngine(db);
    await ops.init();

    const now = Math.floor(Date.now() / 1000);
    const epochId = await ops.initEpoch();

    // MANUAL MIGRATION: Ensure column exists for test seed
    try {
        await db.query("ALTER TABLE registered_nodes ADD COLUMN management_type TEXT DEFAULT 'self_hosted'");
    } catch(e) {}

    // 1. Create a Managed Node
    console.log("Seeding Managed Node...");
    const managedWallet = "0xmanaged_" + now;
    await db.query("INSERT INTO registered_nodes (wallet, last_heartbeat, active, management_type) VALUES (?, ?, 1, ?)", 
        [managedWallet, now, "managed"]);
    
    // 2. Create Uptime for it
    await db.query("INSERT INTO node_uptime (node_wallet, epoch_id, uptime_seconds, score) VALUES (?, ?, 3600, 3600)",
        [managedWallet, epochId]);

    // 3. Inject Revenue to ensure Node Pool > 0
    // Total Rev = 100 USDT -> Node Pool = 50 USDT
    // Managed Node is only node -> gets 100% of Node Pool (50 USDT) -> Deduction 10% (5 USDT) -> Net 45 USDT.
    await db.query("INSERT INTO revenue_events_v2 (epoch_id, op_type, node_id, client_id, amount_usdt, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [epochId, "test_op", "sim_node", "sim_client", 100.0, "success", now]);

    // 4. Finalize
    console.log(`Finalizing Epoch ${epochId}...`);
    await ops.finalizeEpoch(epochId);

    // 5. Verify Earnings
    const reserve = await db.get("SELECT amount_usdt FROM epoch_earnings WHERE epoch_id = ? AND role = ?", [epochId, "infra_reserve"]);
    const operator = await db.get("SELECT amount_usdt FROM epoch_earnings WHERE epoch_id = ? AND role = ? AND wallet_or_node_id = ?", [epochId, "node_operator", managedWallet]);

    console.log("Infra Reserve:", reserve?.amount_usdt);
    console.log("Operator Net:", operator?.amount_usdt);

    if (reserve?.amount_usdt === 5.0 && operator?.amount_usdt === 45.0) {
        console.log("✅ SUCCESS: 10% Deduction Applied Correctly");
    } else {
        console.error("❌ FAILURE: Incorrect Split");
        process.exit(1);
    }

  })();
'
