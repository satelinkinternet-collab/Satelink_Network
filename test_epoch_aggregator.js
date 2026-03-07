// test_epoch_aggregator.js
import Database from "better-sqlite3";
import { closeEpoch } from "./core/epoch_aggregator.js";

const db = new Database("satelink.db");

console.log("Setting up test data...");

// Setup mock epoch
db.prepare(`
    INSERT INTO epochs (id, starts_at, status) 
    VALUES (999, strftime('%s', 'now'), 'OPEN') 
    ON CONFLICT(id) DO UPDATE SET status='OPEN'
`).run();

// Setup mock revenue events (100 USDT total)
db.prepare(`DELETE FROM revenue_events WHERE epoch_id = 999`).run();
db.prepare(`
    INSERT INTO revenue_events (epoch_id, amount_usdt, created_at)
    VALUES 
    (999, 40.0, strftime('%s', 'now')),
    (999, 60.0, strftime('%s', 'now'))
`).run();

// Setup mock node ops (Total ops = 100)
db.prepare(`DELETE FROM op_counts WHERE epoch_id = 999`).run();
db.prepare(`
    INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, created_at)
    VALUES 
    (999, 'nodeA', 'API_Gateway_Ops', 70, strftime('%s', 'now')),
    (999, 'nodeB', 'Validation_Ops', 30, strftime('%s', 'now'))
`).run();

// Run aggregator
console.log("Triggering closeEpoch()...");
try {
    const summary = closeEpoch(db, 999);
    console.log("Success! Summary:");
    console.log(JSON.stringify(summary, null, 2));

    // Verify DB
    const epochRow = db.prepare('SELECT * FROM epochs WHERE id = 999').get();
    console.log("\nUpdated Epoch Row:");
    console.log(epochRow);

    const earnings = db.prepare('SELECT * FROM node_epoch_earnings WHERE epoch_id = 999').all();
    console.log("\nNode Earnings Distributed:");
    console.table(earnings);
} catch (e) {
    console.error("Test failed:", e);
}
