import "dotenv/config";
import { getValidatedDB } from "../src/db/index.js";
import { NodeopsWaterfallService } from "../src/services/nodeops_waterfall.js";
import crypto from 'crypto';

async function run() {
    const config = { dbUrl: process.env.DATABASE_URL || "sqlite://satelink.db" };
    const db = getValidatedDB(config);
    await db.init();
    const service = new NodeopsWaterfallService(db);
    await service.init();
    
    // Clear old data for clean test
    db.prepare('DELETE FROM operator_billing').run();
    db.prepare('DELETE FROM ledger_entries').run();

    // Add dummy operator
    const now = Math.floor(Date.now() / 1000);
    const opId = `op_dummy_${crypto.randomBytes(4).toString('hex')}`;
    
    db.prepare(`
        INSERT INTO operator_billing 
        (operator_id, nodeops_monthly_cost_usdt, reserve_start_date, reserve_months_total, reserve_rate, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run([opId, 150, now, 6, 0.10, now]);
    
    console.log(`Inserted dummy operator: ${opId}`);
    process.exit(0);
}
run();
