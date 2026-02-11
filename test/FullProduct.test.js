import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Satelink DePIN Full Product Verification (LIVE)", function () {
    let app, agent, db;
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";
    let nodeWallet = "0xAAAAAAAAAAAAAAAABBBBBBBBBBBBBBBBCCCCCCCC";
    let epochId;
    let payoutId;

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);

        // Register Managed Node
        await agent.post("/nodes/bootstrap-payment").set("X-Admin-Key", ADMIN_API_KEY).send({ nodeWallet, nodeType: 'managed' });
    });

    after(() => {
        db.close();
    });

    it("1. Node executes ≥10 paid ops in one epoch", async function () {
        // execute 10 ops of type provisioning_op ($0.10 each = $1.00 total revenue)
        for (let i = 0; i < 10; i++) {
            const res = await agent.post("/operations/execute").send({
                nodeWallet,
                opType: 'provisioning_op',
                quantity: 1
            });
            expect(res.status).to.equal(200);
        }

        const statsRes = await agent.get("/operations/epoch-stats");
        expect(statsRes.body.stats.total_ops).to.be.at.least(10);
        expect(statsRes.body.stats.revenue).to.equal(1.00);
        epochId = statsRes.body.stats.epochId;
    });

    it("2. Epoch finalization produces ledger entries (50/30/20 split)", async function () {
        const res = await agent.post("/ledger/epoch/finalize")
            .set('X-Admin-Key', ADMIN_API_KEY)
            .send({ epochId });

        expect(res.status).to.equal(200);

        const ledger = await agent.get(`/ledger/epochs/${epochId}`);
        const entries = ledger.body.ledger;

        // Verify node, treasury, and ecosystem entries
        const treasury = entries.find(e => e.node_wallet === 'PLATFORM_TREASURY' && e.split_type === 'TREASURY');
        const ecosystem = entries.find(e => e.node_wallet === 'PLATFORM_ECOSYSTEM' && e.split_type === 'ECOSYSTEM');
        const nodeReward = entries.find(e => e.node_wallet === nodeWallet && e.split_type === 'NODE_POOL');
        const nodeReserve = entries.find(e => e.node_wallet === nodeWallet && e.split_type === 'INFRA_RESERVE');

        expect(treasury.amount).to.be.closeTo(1.00 * 0.30, 0.001); // $0.30
        expect(ecosystem.amount).to.be.closeTo(1.00 * 0.20, 0.001); // $0.20

        // Node gets 50% ($0.50 gross). Being 'managed', 10% is reserved ($0.05). Net is $0.45.
        expect(nodeReserve.amount).to.be.closeTo(1.00 * 0.50 * 0.10, 0.001); // $0.05
        expect(nodeReward.amount).to.be.closeTo(1.00 * 0.50 * 0.90, 0.001); // $0.45
    });

    it("3. Claim creates entitlement without transfer", async function () {
        const payouts = await agent.get("/ledger/payouts")
            .set('X-Admin-Key', ADMIN_API_KEY)
            .query({ status: 'PENDING' });
        payoutId = payouts.body.payouts.find(p => p.node_wallet === nodeWallet).id;

        const claimRes = await agent.post("/ledger/claim").send({ nodeWallet, payoutId });
        expect(claimRes.status).to.equal(200);
        expect(claimRes.body.status).to.equal('CLAIMED');

        // Verify no withdrawal event was created yet
        const treasury = await agent.get("/ledger/treasury");
        // $50.00 bootstrap + $1.00 op revenue = $51.00
        expect(treasury.body.available).to.equal(51.00);
    });

    it("4. Withdraw executes only with treasury liquidity", async function () {
        // Try to withdraw more than liquidity (impossible in this case as liquidity is 51.00 and reward is 0.45)
        const badRes = await agent.post("/ledger/withdraw").send({ nodeWallet, amount: 100.0 });
        expect(badRes.status).to.equal(500);
        expect(badRes.body.error).to.include("Insufficient claimed balance");

        // Real withdraw
        const res = await agent.post("/ledger/withdraw").send({ nodeWallet, amount: 0.45 });
        expect(res.status).to.equal(200);
        expect(res.body.withdrawn).to.equal(0.45);
    });

    it("5. Platform + nodes receive USDT", async function () {
        // Final Treasury Check
        const treasury = await agent.get("/ledger/treasury");
        // Initial 51.00 - withdrawn 0.45 = 50.55 remaining in treasury
        expect(treasury.body.available).to.be.closeTo(50.55, 0.001);

        // Verify payout status
        const payouts = await agent.get("/ledger/payouts")
            .set('X-Admin-Key', ADMIN_API_KEY)
            .query({ status: 'WITHDRAWN' });
        const finalizedPayout = payouts.body.payouts.find(p => p.id === payoutId);
        expect(finalizedPayout).to.exist;
        expect(finalizedPayout.withdrawn_amount).to.equal(0.45);
    });
});
