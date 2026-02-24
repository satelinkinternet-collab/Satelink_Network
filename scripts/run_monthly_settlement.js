import "dotenv/config";
import { getValidatedDB } from "../src/db/index.js";
import { NodeopsWaterfallService } from "../src/services/nodeops_waterfall.js";

async function run() {
    console.log("==========================================");
    console.log(" NodeOps Monthly Settlement Runner");
    console.log("==========================================");

    const periodStr = process.argv[2];
    const isSimulate = process.argv.includes('--simulate');

    if (!periodStr || !/^\d{4}-\d{2}$/.test(periodStr)) {
        console.error("❌ Usage: node scripts/run_monthly_settlement.js <YYYY-MM> [--simulate]");
        process.exit(1);
    }

    const [yyyy, mm] = periodStr.split('-');
    const year = parseInt(yyyy, 10);
    const month = parseInt(mm, 10) - 1;

    // Use exact UTC boundaries for the month
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const period = {
        start: Math.floor(start.getTime() / 1000),
        end: Math.floor(end.getTime() / 1000),
    };

    console.log(`📅 Settling Period: ${start.toISOString()} to ${end.toISOString()}`);

    const config = { dbUrl: process.env.DATABASE_URL || "sqlite://satelink.db" };
    const db = getValidatedDB(config);
    await db.init();
    
    const service = new NodeopsWaterfallService(db);
    await service.init(); // ensure tables exist

    let operators = [];
    try {
        operators = db.prepare("SELECT operator_id FROM operator_billing").all();
    } catch (e) {
        console.error("❌ Error querying operators:", e.message);
        process.exit(1);
    }

    if (operators.length === 0) {
        console.log("ℹ️ No operators found in billing table. Exiting.");
        process.exit(0);
    }

    // In a production system, this value is fetched per operator from a rewards/earnings service
    const DUMMY_GROSS_REWARD = 1000.0;

    console.log("\nExecuting Waterfall Step 1-3 -> Creating Payment Intents & Ledger Entries...");

    let anySuccess = false;
    let sampleLedger = null;

    for (const op of operators) {
        let grossRewardUsdt = 0;
        let rewardTypeStr = "";

        if (isSimulate) {
            grossRewardUsdt = DUMMY_GROSS_REWARD;
            rewardTypeStr = "(simulated)";
        } else {
            const row = db.prepare(`
                SELECT SUM(amount_usdt) as total
                FROM epoch_earnings
                WHERE role = 'node_operator'
                  AND wallet_or_node_id = ?
                  AND created_at >= ?
                  AND created_at <= ?
            `).get([op.operator_id, period.start, period.end]);
            
            grossRewardUsdt = row && row.total ? Number(row.total) : 0;
            rewardTypeStr = "(real)";
        }

        console.log(`\n⚙️ Operator [${op.operator_id}] (Gross Reward ${rewardTypeStr}: $${Number(grossRewardUsdt).toFixed(8)})`);
        try {
            const result = await service.settleOperatorPeriod(op.operator_id, period, grossRewardUsdt);
            console.log(`   └─ Due: $${result.summary.due_amount} | Paying NodeOps: $${result.summary.pay_nodeops} | Reserve: $${result.summary.alloc_reserve} | Operator Payout: $${result.summary.operator_payout}`);
            
            if (!sampleLedger && result.entries.length > 0) {
                sampleLedger = result.entries;
            }
            anySuccess = true;
        } catch (e) {
            console.error(`   ❌ Failed to settle ${op.operator_id}:`, e.message);
        }
    }

    if (sampleLedger) {
        console.log("\n📄 Sample Ledger Output for one operator:");
        console.log(JSON.stringify(sampleLedger, null, 2));
    }

    console.log("\n✅ run_monthly_settlement phase completed. Intents are saved as 'pending'.");
    console.log(`➡️ Next step: Run 'node scripts/execute_payment_intents.js ${periodStr}' to post payments.`);
    process.exit(anySuccess ? 0 : 1);
}

run();
