import "dotenv/config";
import { getValidatedDB } from "../src/db/index.js";
import { NodeopsWaterfallService } from "../src/services/nodeops_waterfall.js";

async function run() {
    console.log("==========================================");
    console.log(" Simulate Execution of Payment Intents");
    console.log("==========================================");

    const periodStr = process.argv[2];
    if (!periodStr || !/^\d{4}-\d{2}$/.test(periodStr)) {
        console.error("❌ Usage: node scripts/execute_payment_intents.js <YYYY-MM> [--simulate-failure]");
        process.exit(1);
    }
    const simulateFailure = process.argv.includes('--simulate-failure');

    const [yyyy, mm] = periodStr.split('-');
    const year = parseInt(yyyy, 10);
    const month = parseInt(mm, 10) - 1;

    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const period = {
        start: Math.floor(start.getTime() / 1000),
        end: Math.floor(end.getTime() / 1000),
    };

    console.log(`📅 Target Period: ${periodStr} (End: ${period.end})`);

    const config = { dbUrl: process.env.DATABASE_URL || "sqlite://satelink.db" };
    const db = getValidatedDB(config);
    await db.init();

    const service = new NodeopsWaterfallService(db);
    // ensure tables exist, though if running this, they likely do
    await service.init();

    console.log("\n🔍 Checking for 'pending' intents referencing this period...");
    try {
        const pending = db.prepare("SELECT COUNT(*) as c FROM ledger_entries WHERE status = 'pending' AND period_end = ?").get([period.end]);
        if (pending.c === 0) {
            console.log("   └─ No pending intents found for this period. Exiting.");
            process.exit(0);
        }
        console.log(`   └─ Found ${pending.c} pending intents.`);
    } catch (e) {
        console.error("❌ DB Query Failed:", e.message);
        process.exit(1);
    }

    console.log("\n⏳ Executing Payments (Simulated)...");

    try {
        const execRes = await service.executePayments(period.start, period.end, simulateFailure);

        if (execRes.status === 'simulated_failure') {
            console.log(`\n❌ NodeOps upstream payment failed. Triggering safeguard!`);
            console.log(`   └─ Status: ${execRes.status}`);
            console.log(`   └─ No reserve or payouts unlocked.`);
            process.exit(1);
        }

        console.log(`\n✅ Payment Intents Execution Complete.`);
        console.log(`   └─ Status: ${execRes.status}`);
        console.log(`   └─ posted_nodeops: ${execRes.details.posted_nodeops}`);
        console.log(`   └─ posted_reserve: ${execRes.details.posted_reserve}`);
        console.log(`   └─ posted_payouts: ${execRes.details.posted_payouts}`);
        console.log(`   └─ total_posted:   ${execRes.details.total_posted}`);
    } catch (e) {
        console.error("\n❌ Execution Failed:", e.message);
        process.exit(1);
    }

    process.exit(0);
}

run();
