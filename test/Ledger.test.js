import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Ledger L5 Router & Finalization Test", function () {
    let app, agent, db;
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";
    let opsEngine;
    let node1 = "0x1111111111111111111111111111111111111111";
    let node2 = "0x2222222222222222222222222222222222222222";
    let epochId;

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);

        // Execute some ops to generate revenue
        // Node 1: 10 ops ($0.01 * 10 = $0.10)
        await agent.post("/operations/execute").send({ nodeWallet: node1, opType: 'api_relay_execution', quantity: 10 });
        // Node 2: 10 ops ($0.01 * 10 = $0.10)
        await agent.post("/operations/execute").send({ nodeWallet: node2, opType: 'api_relay_execution', quantity: 10 });

        // Use monitoring op (price 0.01) * 100 = $1.00
        await agent.post("/operations/execute").send({ nodeWallet: node1, opType: 'monitoring_op', quantity: 100 });

        // Total Revenue: 0.10 + 0.10 + 1.00 = 1.20
        // Node Pool (50%): 0.60
        // Node 1 Share roughly: (10 ops + 100 ops) vs (10 ops). 110 vs 10.
        // Node 1: 110/120 * 0.60 = 0.55
        // Node 2: 10/120 * 0.60 = 0.05
    });

    after(() => {
        db.close();
    });

    it("should get current epoch stats", async function () {
        const res = await agent.get("/operations/epoch-stats");
        epochId = res.body.stats.epochId;
        expect(res.body.stats.revenue).to.be.closeTo(1.20, 0.001);
        expect(res.body.stats.isFinalized).to.be.false;
    });

    it("should finalize epoch deterministically", async function () {
        const res = await agent.post("/operations/epoch/finalize").send({ epochId });
        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;
        expect(res.body.totalRevenue).to.be.closeTo(1.20, 0.001);
        expect(res.body.nodePool).to.be.closeTo(0.60, 0.001);
        expect(res.body.rewardsDistributed).to.equal(2);
    });

    it("should verify immutable ledger entries", async function () {
        const res = await agent.get(`/ledger/epochs/${epochId}`);
        expect(res.status).to.equal(200);
        const ledger = res.body.ledger;
        expect(ledger).to.have.lengthOf(2);

        const r1 = ledger.find(r => r.node_wallet === node1);
        const r2 = ledger.find(r => r.node_wallet === node2);

        expect(r1.amount).to.be.closeTo(0.55, 0.01);
        expect(r2.amount).to.be.closeTo(0.05, 0.01);
    });

    it("should verify payout queue", async function () {
        const res = await agent.get("/ledger/payouts");
        expect(res.status).to.equal(200);
        const payouts = res.body.payouts;
        expect(payouts).to.have.lengthOf(2);
        expect(payouts[0].status).to.equal('PENDING');
    });

    it("should export audit report", async function () {
        const res = await agent.get("/ledger/export").query({ epochId });
        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;
        expect(res.body.report.ledger_count).to.equal(2);
        expect(res.body.report.data[0]).to.have.property('wallet');
    });

    it("should reject new ops after finalization", async function () {
        const res = await agent.post("/operations/execute").send({ nodeWallet: node1, opType: 'api_relay_execution', quantity: 1 });
        expect(res.status).to.equal(500);
        expect(res.body.error).to.include("finalized");
    });

    it("should prevent re-finalization", async function () {
        const res = await agent.post("/operations/epoch/finalize").send({ epochId });
        expect(res.status).to.equal(500);
        expect(res.body.error).to.include("already finalized");
    });
});
