// test_node_earnings_api.js
import Database from "better-sqlite3";
import { getAggregatedNodeEarnings } from "./core/node_earnings.js";

const db = new Database("satelink.db");

console.log("Setting up node earnings test records...");

// 1. Mock Node
db.prepare(`
    INSERT INTO registered_nodes (wallet, node_type, active) 
    VALUES ('node-123', 'edge', 1) 
    ON CONFLICT(wallet) DO UPDATE SET active=1
`).run();

db.prepare(`
    INSERT INTO registered_nodes (wallet, node_type, active) 
    VALUES ('node-ZERO', 'edge', 1) 
    ON CONFLICT(wallet) DO UPDATE SET active=1
`).run();

// 2. Clear old test data
db.prepare("DELETE FROM node_epoch_earnings WHERE node_id IN ('node-123', 'node-ZERO')").run();
db.prepare("DELETE FROM node_claims WHERE node_id IN ('node-123', 'node-ZERO')").run();
db.prepare("DELETE FROM epochs WHERE id IN (1, 2)").run();

// 3. Mock Epochs
db.prepare(`INSERT INTO epochs (id, starts_at, status) VALUES (1, strftime('%s', 'now', '-2 days'), 'CLOSED')`).run();
db.prepare(`INSERT INTO epochs (id, starts_at, status) VALUES (2, strftime('%s', 'now'), 'CLOSED')`).run();

// 4. Insert Node Earnings for node-123
db.prepare(`
    INSERT INTO node_epoch_earnings (node_id, epoch_id, earnings_usdt, ops_processed, weight)
    VALUES 
    ('node-123', 1, 120.330000, 1000000, 100),
    ('node-123', 2, 340.500000, 1431220, 143)
`).run();

// 5. Insert node claim history for node-123
db.prepare(`
    INSERT INTO node_claims (node_id, epoch_id, amount_usdt)
    VALUES ('node-123', 1, 100.000000)
`).run();

console.log("\nExecuting Node Earnings API Logic...");

try {
    // Test A: Populated user
    const responsePopulated = getAggregatedNodeEarnings(db, "node-123");
    console.log("\n✅ Populated Node Response:");
    console.log(JSON.stringify(responsePopulated, null, 2));

    // Test B: Empty user (no revenue events, perfectly active node)
    const responseEmpty = getAggregatedNodeEarnings(db, "node-ZERO");
    console.log("\n✅ Zero-Data Node Response:");
    console.log(JSON.stringify(responseEmpty, null, 2));

} catch (e) {
    console.error("Test execution failed:", e);
}
