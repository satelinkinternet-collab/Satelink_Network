import "dotenv/config";
import { getValidatedDB } from "../src/db/index.js";
import { NodeopsWaterfallService } from "../src/services/nodeops_waterfall.js";

async function run() {
    console.log("==========================================");
    console.log(" NodeOps Economics Settlement Script");
    console.log("==========================================");

    const periodStr = process.argv[2];
    if (!periodStr) {
        console.log("Usage: node scripts/settle_nodeops_billing.js <YYYY-MM>");
        process.exit(1);
    }

    const [yyyy, mm] = periodStr.split('-');
    const year = parseInt(yyyy, 10);
    const month = parseInt(mm, 10) - 1;

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const period = {
        start: Math.floor(start.getTime() / 1000),
        end: Math.floor(end.getTime() / 1000),
    };

    console.log(`Settling Period: ${start.toISOString()} to ${end.toISOString()}`);

    const config = { dbUrl: process.env.DATABASE_URL || "sqlite://satelink.db" };
    const db = getValidatedDB(config);
    await db.init();
    const service = new NodeopsWaterfallService(db);
    await service.init();

    // In a real flow, this queries `operator_billing` JOIN `reputation` / `earnings` for period gross.
    // For manual/sandbox: We'll pull a dummy $1000 gross reward for every active billing operator.

    let operators = [];
    try {
        operators = db.prepare("SELECT operator_id FROM operator_billing").all();
    } catch (e) {
        console.log("Error querying operators:", e.message);
        process.exit(1);
    }

    if (operators.length === 0) {
        console.log("No operators found in billing table. Exiting.");
        process.exit(0);
    }

    const DUMMY_GROSS_REWARD = 1000.0;

    for (const op of operators) {
        console.log(`\nSettling Operator [${op.operator_id}] (Reward: $${DUMMY_GROSS_REWARD})`);
        try {
            const result = await service.settleOperatorPeriod(op.operator_id, period, DUMMY_GROSS_REWARD);
            console.log(JSON.stringify(result.summary, null, 2));
        } catch (e) {
            console.error(`Failed to settle ${op.operator_id}:`, e.message);
        }
    }

    console.log("\nExecuting queued payments...");
    const execRes = await service.executePayments(period.start, period.end);
    console.log(execRes);

    console.log("\n✅ Settlement Complete.");
    process.exit(0);
}

run();
