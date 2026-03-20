import { PgDatabase } from "./apps/api/src/database/pg_adapter.js";
import { WithdrawalProcessor } from "./apps/api/src/settlement/withdrawal_processor.js";
import dotenv from "dotenv";
dotenv.config();

// Ensure local connection override for host-side execution
const DATABASE_URL = "postgres://satelink:satelinkpassword@localhost:5432/satelink";

async function main() {
    process.env.FUSE_RPC_URL = "http://localhost:8545"; // For host side Anvil
    
    console.log("Connecting to Postgres...");
    const db = await PgDatabase.create(DATABASE_URL);
    
    // Inject the mock PgDatabase normalization fix that was causing issues if omitted
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
        const stmt = originalPrepare(sql);
        const originalAll = stmt.all.bind(stmt);
        const originalRun = stmt.run.bind(stmt);
        stmt.all = async (...args) => originalAll((args.length === 1 && Array.isArray(args[0])) ? args[0] : args);
        stmt.run = async (...args) => originalRun((args.length === 1 && Array.isArray(args[0])) ? args[0] : args);
        return stmt;
    };

    console.log("Starting Withdrawal Processor manually...");
    const processor = new WithdrawalProcessor(db);
    
    await processor.processPendingWithdrawals();
    
    console.log("Finished passing over the pending queue.");
    process.exit(0);
}

main().catch(console.error);
