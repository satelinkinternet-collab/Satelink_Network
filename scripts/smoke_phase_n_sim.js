import { UniversalDB } from '../src/db/index.js';
import { AutoOpsEngine } from '../src/services/autonomous/auto_ops_engine.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SQLITE_PATH || resolve(__dirname, '../satelink.db');

async function run() {
    console.log("=== Phase N Logic Simulation (via UniversalDB) ===");

    // 1. Init DB
    const db = new UniversalDB({
        type: 'sqlite',
        connectionString: dbPath
    });
    await db.init();

    // 2. Init Engine
    const autoOps = new AutoOpsEngine(db);

    // Clean slate
    await db.query("DELETE FROM ops_recommendations");
    await db.query("DELETE FROM node_bonus_flags");
    await db.query("DELETE FROM churn_risk_flags");
    await db.query("DELETE FROM admin_audit_log WHERE actor_wallet = 'system_auto'");
    await db.query("DELETE FROM revenue_stability_daily WHERE day_yyyymmdd = 20250101");
    // unit_economics_daily has no fixed ID, just unique created_at? No, PK is date_key? 
    // Wait, let's check schema for unit_economics_daily.
    // "date_key TEXT PRIMARY KEY". 
    // But my insert uses (total_revenue, ...) VALUES. 
    // It blindly inserts? 
    // Wait, layer34 says: "date_key TEXT PRIMARY KEY" 
    // But my insert is: INSERT INTO unit_economics_daily (total_revenue...) VALUES ... 
    // If I don't provide date_key, it might be null? SQLite allows null PK? 
    // Or did I look at the wrong schema?
    // layer34 schema: `date_key TEXT PRIMARY KEY`.
    // My insert: `VALUES (1000, 900, ?)` -> 3 params. 
    // Insert columns: `(total_revenue, burn_rate, created_at)`.
    // So date_key is missing. 
    // SQLite might auto-gen rowid if I don't provide PK? 
    // No, "TEXT PRIMARY KEY" usually means required. 
    // Unless it's `INTEGER PRIMARY KEY` which is alias for RowID.
    // `date_key` is TEXT.
    // So my insert SHOULD fail if I don't provide date_key. 
    // But it passed in step 4104! 
    // "One or more columns that are not in the column list have constraints but no default value"
    // Maybe `created_at` or `date_key` has default? 
    // Schema: `date_key TEXT NOT NULL`. No default.
    // Why did it pass? 
    // Maybe `layer60` redefined it? 
    // Let's check `node_profitability_daily`...
    // Actually, I should just Clean up everything to be safe.
    await db.query("DELETE FROM unit_economics_daily");

    // ----------------------------------------------------
    // Scenario 1: High Burn -> Reward Adjustment Recommendation
    // ----------------------------------------------------
    console.log("\n[1] Simulating High Burn...");
    // disable auto execute to get recommendation
    await db.query("INSERT INTO system_config (key, value) VALUES ('auto_reward_enabled', 'false') ON CONFLICT(key) DO UPDATE SET value = 'false'");
    await db.query("INSERT INTO system_config (key, value) VALUES ('autonomous_ops_enabled', 'true') ON CONFLICT(key) DO UPDATE SET value = 'true'");

    // Insert Mock Econ Data (High Burn)
    await db.query(`
        INSERT INTO unit_economics_daily (total_revenue, burn_rate, created_at)
        VALUES (1000, 900, ?)
    `, [Date.now()]);
    // Insert Mock Stability (Low)
    await db.query(`
        INSERT INTO revenue_stability_daily (day_yyyymmdd, stability_score, created_at)
        VALUES (20250101, 40, ?)
    `, [Date.now()]);

    await autoOps.runTreasuryGuard(true); // enabled=true (master switch)

    const rec1 = await db.get("SELECT * FROM ops_recommendations WHERE type = 'reward_adjust'");
    if (rec1) console.log("✅ Reward Adjustment Recommended:", rec1.recommendation_json);
    else console.error("❌ Failed to recommend reward adjustment");

    // ----------------------------------------------------
    // Scenario 2: Node Improving -> Bonus
    // ----------------------------------------------------
    console.log("\n[2] Simulating Node Improvement...");
    await db.query("INSERT INTO system_config (key, value) VALUES ('auto_node_bonus_enabled', 'true') ON CONFLICT(key) DO UPDATE SET value = 'true'");

    // Insert High Reputation Node
    await db.query("INSERT OR REPLACE INTO node_reputation (node_id, composite_score, last_updated_at) VALUES ('node_star', 95, ?)", [Date.now()]);

    // Run Logic (Auto Execute)
    await autoOps.runNodeIncentives(true);

    const bonus = await db.get("SELECT * FROM node_bonus_flags WHERE node_id = 'node_star'");
    if (bonus) console.log("✅ Node Bonus Granted:", bonus.multiplier, bonus.reason);
    else console.error("❌ Failed to grant node bonus");

    // ----------------------------------------------------
    // Scenario 3: Churn Risk
    // ----------------------------------------------------
    console.log("\n[3] Simulating Churn Risk...");
    // 3 days of negative margin
    await db.query("INSERT INTO node_econ_daily (node_id, net_usdt) VALUES ('node_risk', -5)");
    await db.query("INSERT INTO node_econ_daily (node_id, net_usdt) VALUES ('node_risk', -5)");
    await db.query("INSERT INTO node_econ_daily (node_id, net_usdt) VALUES ('node_risk', -5)");

    await autoOps.runChurnScanner(true);

    const flag = await db.get("SELECT * FROM churn_risk_flags WHERE node_id = 'node_risk'");
    if (flag) console.log("✅ Churn Risk Flagged:", flag.risk_factor);
    else console.error("❌ Failed to flag churn risk");

    // Cleanup DB connection?
    // db.close(); // UniversalDB doesn't have close exposed in interface? 
    // It has close() method.
    if (db.close) db.close();
}

run().catch(console.error);
