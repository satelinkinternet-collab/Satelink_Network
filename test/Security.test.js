import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Security & Abuse Protection Test", function () {
    let app, agent, db;
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";
    let nodeWallet = "0x9999999999999999999999999999999999999999";

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);

        // Setup node
        await agent.post("/nodes/bootstrap-payment").set("X-Admin-Key", ADMIN_API_KEY).send({ nodeWallet, nodeType: 'edge' });
    });

    after(() => {
        db.close();
    });

    it("should reject admin endpoints without key", async function () {
        const res = await agent.post("/ledger/epoch/finalize").send({ epochId: 1 });
        expect(res.status).to.equal(401);
    });

    it("should allow admin endpoints with correct key", async function () {
        // Try to finalize a non-existent epoch or just a check
        const res = await agent.post("/ledger/epoch/finalize")
            .set('X-Admin-Key', ADMIN_API_KEY)
            .send({ epochId: 999 }); // Non-existent epoch will still pass 401 check
        expect(res.status).to.not.equal(401);
    });

    it("should detect abuse (operation spike)", async function () {
        // We need to simulate > 5000 ops.
        // Instead of 5000 calls, we can just send a large quantity if our executeOp allows it
        // Or we manually inject into DB for the test
        db.prepare("INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at) VALUES (1, ?, 'api_relay_execution', 6000, 1.0, ?)")
            .run(nodeWallet, Math.floor(Date.now() / 1000));

        const res = await agent.post("/operations/execute").send({
            nodeWallet,
            opType: 'api_relay_execution',
            quantity: 1
        });

        expect(res.status).to.equal(500);
        expect(res.body.error).to.include("Abuse Detected");
    });

    it("should auto-pause withdrawals if treasury is unsafe", async function () {
        // Force negative treasury by injecting a large withdrawal manually
        db.prepare("INSERT INTO revenue_events (amount, token, source, created_at) VALUES (-1000, 'USDT', 'MALICIOUS_DRAIN', ?)")
            .run(Math.floor(Date.now() / 1000));

        // Try to withdraw (even if we had claimed balance)
        const res = await agent.post("/ledger/withdraw").send({ nodeWallet, amount: 0.01 });
        expect(res.status).to.equal(500);
        expect(res.body.error).to.include("PAUSED");

        // Verify security_freeze is '1'
        const freeze = db.prepare("SELECT value FROM system_config WHERE key = 'security_freeze'").get();
        expect(freeze.value).to.equal('1');
    });

    it("should verify protocol and registry endpoints are protected", async function () {
        const res1 = await agent.post("/protocol/pool/open").send({});
        expect(res1.status).to.equal(401);

        const res2 = await agent.post("/registry/sync").send({});
        expect(res2.status).to.equal(401);

        const res3 = await agent.post("/epoch/finalize").send({ epochId: 1 });
        expect(res3.status).to.equal(401);

        const res4 = await agent.post("/withdraw/execute").send({ nodeWallet: '0x1', amount: 0.1 });
        expect(res4.status).to.equal(401);

        const res5 = await agent.post("/protocol/pool/open")
            .set('X-Admin-Key', ADMIN_API_KEY)
            .send({});
        expect(res5.status).to.equal(200);
    });

    it("should initiate freeze on 401 spikes", async function () {
        // Reset freeze if set by previous tests
        db.prepare("UPDATE system_config SET value = '0' WHERE key = 'security_freeze'").run();
        db.prepare("UPDATE system_config SET value = '0' WHERE key = 'withdrawals_paused'").run();

        // Simulate 11 failed attempts (threshold is 10)
        for (let i = 0; i < 11; i++) {
            await agent.post("/epoch/finalize").set('X-Admin-Key', 'WRONG_KEY').send({ epochId: 1 });
        }

        // Verify security_freeze is now '1'
        const freeze = db.prepare("SELECT value FROM system_config WHERE key = 'security_freeze'").get();
        expect(freeze.value).to.equal('1');
        const paused = db.prepare("SELECT value FROM system_config WHERE key = 'withdrawals_paused'").get();
        expect(paused.value).to.equal('1');
    });
});
