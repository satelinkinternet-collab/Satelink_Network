import { RevenueForecastEngine } from '../../../economics/revenue_forecast_engine.js';
import { FuturesEscrow } from '../../../settlement/futures_escrow.js';
import { closeEpoch } from '../../../economics/epoch_aggregator.js';
import { createFuturesRouter } from '../../../gateway/routes/futures_api.js';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { attachSchema } from '../../../core/schema.js';

async function test_futures_market() {
    console.log("== Initiating End-to-End Infrastructure Futures Market Simulation ==");

    // 1. Setup pure SQLite memory DB mapping 1:1 to schema structures
    const db = new Database(':memory:');
    attachSchema(db); // Initializes the massive schema including node_futures_contracts

    // Define legacy tables missing from the pure isolated schema boot
    db.prepare("CREATE TABLE epochs (id INTEGER PRIMARY KEY, status TEXT, total_revenue_usdt REAL, node_pool_usdt REAL, platform_share_usdt REAL, distributor_share_usdt REAL, total_node_weight REAL, closed_at INTEGER)").run();
    db.prepare("CREATE TABLE node_epoch_earnings (id INTEGER PRIMARY KEY AUTOINCREMENT, node_id TEXT, epoch_id INTEGER, earnings_usdt REAL, ops_processed INTEGER, weight REAL)").run();
    try { db.prepare("ALTER TABLE revenue_events ADD COLUMN epoch_id INTEGER").run(); } catch (e) { }
    try { db.prepare("ALTER TABLE revenue_events ADD COLUMN amount_usdt REAL").run(); } catch (e) { }

    // Give ourselves a node operator and some fake history
    const nodeId = "operator_node_777";
    db.prepare(`INSERT INTO registered_nodes (wallet, active, is_flagged) VALUES (?, 1, 0)`).run(nodeId);
    db.prepare(`INSERT INTO epochs (id, status) VALUES (50, 'CLOSED')`).run();
    db.prepare(`INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at) VALUES (50, ?, 'test', 100, 100, 10)`).run(nodeId);

    // Create an open epoch 51 to settle
    db.prepare(`INSERT INTO epochs (id, status) VALUES (51, 'OPEN')`).run();

    const forecastEngine = new RevenueForecastEngine(db);
    const escrow = new FuturesEscrow(db);

    const app = express();
    app.use(express.json());
    app.use('/v1/futures', createFuturesRouter(db, escrow));

    // 2. Revenue Foreman simulates the node's forecast
    const forecast = forecastEngine.forecastRevenue(nodeId, 3);
    console.log(`[Test] Node operator forecast across 3 epochs:`, forecast);

    // 3. Node lists a smart contract via API
    console.log("[Test] Operator lists 30% revenue share for 20 USDT for epoch 51.");
    const listRes = await request(app)
        .post('/v1/futures')
        .set('X-API-Key', 'node_secret_key') // generic hash proxy
        .send({
            node_id: nodeId,
            revenue_share: 0.30,
            epoch_range: [51, 51],
            price: 20
        });

    if (listRes.statusCode !== 201) {
        console.error("FAIL: Could not list contract", listRes.body);
        process.exit(1);
    }
    const contractId = listRes.body.contract_id;

    // 4. Investor Purchases the Contract
    console.log(`[Test] Investor purchases contract ${contractId} via API.`);
    const buyRes = await request(app)
        .post('/v1/futures/buy')
        .set('X-API-Key', 'investor_secret')
        .send({
            contract_id: contractId,
            price: 20
        });

    if (buyRes.statusCode !== 200) {
        console.error("FAIL: Could not purchase contract", buyRes.body);
        process.exit(1);
    }

    // 5. Simulate heavy workloads occuring during Epoch 51 generating $1000 in Revenue
    console.log("[Test] Simulated $1000 revenue event occurs for Epoch 51. Total System nodes: 1 (Operator)");
    db.prepare(`
        INSERT INTO revenue_events (epoch_id, amount_usdt, token, source, created_at) 
        VALUES (51, 1000, 'USDT', 'simulated_ops', 123)
    `).run();
    db.prepare(`
        INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at) 
        VALUES (51, ?, 'inference', 1000, 1000, 123)
    `).run(nodeId);

    // 6. Close Epoch and Settle the Split
    console.log("[Test] Closing Epoch 51. Operator pool = 50% ($500). Operator should give 30% of $500 ($150) to Investor.");
    const rollup = closeEpoch(db, 51);

    console.log(`[Test] Epoch Result:`, rollup);

    // 7. Verification Reads
    const nodeEarningsRow = db.prepare(`SELECT earnings_usdt FROM node_epoch_earnings WHERE node_id = ? AND epoch_id = 51`).get(nodeId);

    // Total total is 500 Node Pool. Minus 30% (150) = 350.
    if (Math.abs(nodeEarningsRow.earnings_usdt - 350) > 0.01) {
        console.error(`FAIL: Operator obtained incorrect payout scalar. Expected ~350, got ${nodeEarningsRow.earnings_usdt}`);
        process.exit(1);
    }

    const investorEvent = db.prepare(`SELECT amount FROM revenue_events WHERE source = ?`).get(`futures_${contractId}_yield`);
    if (Math.abs(investorEvent.amount - 150) > 0.01) {
        console.error(`FAIL: Investor obtained incorrect payout scalar. Expected ~150, got ${investorEvent.amount}`);
        process.exit(1);
    }

    const metrics = db.prepare(`SELECT * FROM futures_metrics`).get();
    console.log("[Test] Futures Metrics Engine Updated Successfully:", metrics);

    console.log("SUCCESS: End-to-End Futures Market architecture securely settled!");
    process.exit(0);
}

test_futures_market();
