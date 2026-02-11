import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Revenue Split & Infra Reserve Test", function () {
    let app, agent, db;
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";
    let nodeManaged = "0x1111111111111111111111111111111111111111";
    let nodeEdge = "0x2222222222222222222222222222222222222222";
    let epochId;

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);

        // 1. Setup Nodes
        // Managed Node pays bootstrap
        await agent.post("/nodes/bootstrap-payment").set("X-Admin-Key", ADMIN_API_KEY).send({ nodeWallet: nodeManaged, nodeType: 'managed' });
        // Edge Node registered via generic op (defaults to edge)
        await agent.post("/operations/execute").send({ nodeWallet: nodeEdge, opType: 'routing_decision_compute', quantity: 1 });

        // 2. Generate Revenue
        // Total revenue will be from ops
        // Let's make it easy: $100.00 total from ops
        await agent.post("/operations/execute").send({ nodeWallet: nodeManaged, opType: 'provisioning_op', quantity: 500 }); // 500 * 0.10 = $50
        await agent.post("/operations/execute").send({ nodeWallet: nodeEdge, opType: 'provisioning_op', quantity: 500 }); // 500 * 0.10 = $50

        // Total Op Revenue = $100
        // (Note: bootstrap payment revenue $50 is also there but it's not part of the ops epoch stats usually unless we match references. 
        // Actually recordOperation records against epoch. bootstrap-payment records against 'managed_node_bootstrap' source.)
        // finalizeEpoch looks for reference LIKE 'epoch:ID%'.
    });

    after(() => {
        db.close();
    });

    it("should finalize with 50/30/20 split", async function () {
        const statsRes = await agent.get("/operations/epoch-stats");
        epochId = statsRes.body.stats.epochId;
        const totalOpRevenue = statsRes.body.stats.revenue;
        expect(totalOpRevenue).to.equal(100.001); // 100 from provisioning + 0.001 from the first edge op

        const res = await agent.post("/operations/epoch/finalize")
            .set('X-Admin-Key', ADMIN_API_KEY)
            .send({ epochId });
        expect(res.status).to.equal(200);

        const splits = res.body.splits;
        expect(splits.nodePool).to.be.closeTo(totalOpRevenue * 0.50, 0.001);
        expect(splits.treasuryPool).to.be.closeTo(totalOpRevenue * 0.30, 0.001);
        expect(splits.ecosystemPool).to.be.closeTo(totalOpRevenue * 0.20, 0.001);
    });

    it("should apply 10% infra reserve ONLY to managed nodes", async function () {
        const res = await agent.get(`/ledger/epochs/${epochId}`);
        const ledger = res.body.ledger;

        // Find node rewards
        const managedRewards = ledger.filter(l => l.node_wallet === nodeManaged);
        const edgeRewards = ledger.filter(l => l.node_wallet === nodeEdge);

        // Managed node should have NODE_POOL and INFRA_RESERVE
        const mPool = managedRewards.find(r => r.split_type === 'NODE_POOL');
        const mReserve = managedRewards.find(r => r.split_type === 'INFRA_RESERVE');

        expect(mReserve).to.exist;
        expect(mReserve.amount).to.be.closeTo(mPool.amount / 0.9 * 0.1, 0.001);

        // Edge node should have NODE_POOL only
        const ePool = edgeRewards.find(r => r.split_type === 'NODE_POOL');
        const eReserve = edgeRewards.find(r => r.split_type === 'INFRA_RESERVE');

        expect(eReserve).to.not.exist;
        expect(ePool.amount).to.be.greaterThan(0);
    });

    it("should update infra_reserved column for managed node", async function () {
        const node = db.prepare("SELECT infra_reserved FROM registered_nodes WHERE wallet = ?").get(nodeManaged);
        expect(node.infra_reserved).to.be.greaterThan(0);

        const edgeNode = db.prepare("SELECT infra_reserved FROM registered_nodes WHERE wallet = ?").get(nodeEdge);
        expect(edgeNode.infra_reserved).to.equal(0);
    });

    it("should verify treasury and ecosystem entries exist", async function () {
        const res = await agent.get(`/ledger/epochs/${epochId}`);
        const ledger = res.body.ledger;

        const treasury = ledger.find(l => l.split_type === 'TREASURY');
        const ecosystem = ledger.find(l => l.split_type === 'ECOSYSTEM');

        expect(treasury.node_wallet).to.equal('PLATFORM_TREASURY');
        expect(ecosystem.node_wallet).to.equal('PLATFORM_ECOSYSTEM');
    });
});
