import { UniversalDB } from '../src/db/index.js';
import { AutoOpsEngine } from '../src/services/autonomous/auto_ops_engine.js';
import { RecommendationEngine } from '../src/services/autonomous/recommendation_engine.js';

const db = new UniversalDB({ type: 'sqlite', connectionString: 'satelink.db' });
const autoOps = new AutoOpsEngine(db);

async function run() {
    console.log("=== Phase N Detailed Smoke Test ===");
    await db.init();

    try {
        // 1. Seed Config for test
        await db.query("INSERT OR REPLACE INTO system_config (key, value) VALUES ('burn_threshold_pct', '20')");
        await db.query("INSERT OR REPLACE INTO system_config (key, value) VALUES ('reward_adjustment_step_pct', '10')");
        await db.query("INSERT OR REPLACE INTO system_config (key, value) VALUES ('reward_multiplier_effective', '1.0')");
        await db.query("INSERT OR REPLACE INTO system_config (key, value) VALUES ('safe_mode', 'false')");
        await db.query("INSERT OR REPLACE INTO system_config (key, value) VALUES ('emergency_lockdown', 'false')");

        // Clear previous runs
        await db.query("DELETE FROM ops_recommendations");
        await db.query("DELETE FROM auto_actions_log");
        await db.query("DELETE FROM revenue_stability_daily WHERE day_yyyymmdd = 20260101");
        await db.query("DELETE FROM unit_economics_daily");

        // 2. Seed Metrics (Trigger Reward Reduction)
        // High Burn Rate (Rev=100, Burn=150 -> 150% > 20%)
        await db.query("INSERT INTO unit_economics_daily (burn_rate, total_revenue, created_at) VALUES (150, 100, ?)", [Date.now()]);
        await db.query("INSERT INTO revenue_stability_daily (stability_score, day_yyyymmdd) VALUES (100, 20260101)"); // Stability OK

        // 3. Run Recommendation Engine
        console.log("[1] Running Recommendation Engine...");
        await autoOps.runDailyJob();

        // 4. Verify Recommendation Created
        const rec = await db.get("SELECT * FROM ops_recommendations WHERE type = 'reward_adjust' AND status = 'pending'");
        if (!rec) throw new Error("Recommendation NOT created!");
        console.log(`✅ Recommendation created: ${rec.type} (ID: ${rec.id})`);

        const recData = JSON.parse(rec.recommendation_json);
        console.log(`   Action: ${recData.action}, Value: ${recData.value}`);

        // 5. Execute Recommendation (Simulate Admin Accept)
        console.log("[2] Executing Recommendation...");
        // This will call autoReward.execute()
        await autoOps.executeRecommendation(rec, 'admin_test_user');

        // 6. Verify Execution Results
        // A) Status updated
        const updatedRec = await db.get("SELECT status FROM ops_recommendations WHERE id = ?", [rec.id]);
        if (updatedRec.status !== 'executed') throw new Error(`Status mismatch: ${updatedRec.status}`);
        console.log("✅ Recommendation status updated to 'executed'");

        // B) Config Updated (1.0 -> 0.9)
        const sysConf = await db.get("SELECT value FROM system_config WHERE key = 'reward_multiplier_effective'");
        const val = parseFloat(sysConf.value);
        if (val > 0.91 || val < 0.89) throw new Error(`Multiplier update failed. Expected 0.9, got ${val}`);
        console.log(`✅ System config updated: reward_multiplier_effective = ${val}`);

        // C) Audit Log
        const log = await db.get("SELECT * FROM auto_actions_log WHERE action_type = 'reward_adjust'");
        if (!log) throw new Error("Audit log missing");
        console.log("✅ Audit log entry found");

        // 7. Test Safety Guardrail
        console.log("[3] Testing Safety Guardrail (Safe Mode)...");
        await db.query("UPDATE system_config SET value = 'true' WHERE key = 'safe_mode'");

        try {
            // Actor=system_auto, force=false -> Should throw Safety Guardrail error
            await autoOps.executeRecommendation({ ...rec, id: 'mock_id_2' }, 'system_auto', false);
            throw new Error("Guardrail FAILED: Execution should have been blocked");
        } catch (e) {
            if (e.message.includes("Safety Guardrail: Execution blocked")) {
                console.log("✅ Safe Mode blocked execution correctly");
            } else {
                throw e;
            }
        }

        console.log("=== ALL TESTS PASSED ===");

    } catch (e) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

run();
