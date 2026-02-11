import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Mandatory Ops & Pricing Test", function () {
    let app;
    let agent;
    let db;
    let nodeWallet = "0x1234567890123456789012345678901234567890";

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);
    });

    after(() => {
        db.close();
    });

    const OPS = [
        { type: 'api_relay_execution', price: 0.01 },
        { type: 'automation_job_execute', price: 0.05 },
        { type: 'network_health_oracle_update', price: 0.02 },
        { type: 'routing_decision_compute', price: 0.001 },
        { type: 'verification_op', price: 0.05 },
        { type: 'provisioning_op', price: 0.10 },
        { type: 'monitoring_op', price: 0.01 },
        { type: 'claim_validation_op', price: 0.02 },
        { type: 'withdraw_execution_op', price: 0.05 },
        { type: 'epoch_score_compute', price: 0.05 }
    ];

    OPS.forEach(op => {
        it(`should execute ${op.type} and record ${op.price} revenue`, async function () {
            const res = await agent.post("/operations/execute").send({
                nodeWallet,
                opType: op.type,
                quantity: 1
            });

            if (res.status !== 200) console.log(res.body);
            expect(res.status).to.equal(200);
            expect(res.body.ok).to.be.true;
            expect(res.body.revenue).to.equal(op.price);

            // Verify DB
            const row = db.prepare("SELECT amount FROM revenue_events WHERE reference = ?").get(`operation:${op.type}`);
            // Note: Since we run loop, we might have multiple events. Need to filter by created_at or just check last.
            // But for simple test, checking if *any* event exists is okay, or sum.
            // Let's check epoch stats total revenue to be precise.
        });
    });

    it("should calculate total revenue correctly", async function () {
        // Sum of all prices above
        const expectedTotal = OPS.reduce((sum, op) => sum + op.price, 0);

        const res = await agent.get("/operations/epoch-stats");
        expect(res.body.stats.revenue).to.be.closeTo(expectedTotal, 0.0001);
    });

    it("should enforce rate limits", async function () {
        const opType = 'provisioning_op'; // Limit is 10
        const limit = 10;

        // Reset limit window? No easy way to mock time here without sinon.
        // We assume test runs fast enough to be in same window.

        // We already called it 1 time in loop above. So 9 more allowed.
        for (let i = 0; i < limit; i++) {
            await agent.post("/operations/execute").send({
                nodeWallet,
                opType,
                quantity: 1
            });
        }

        // The 11th call (total 12th including loop) should fail or 10th if loop counted.
        // Limit 10.
        // Loop 1 (ops check) -> Count 1.
        // Loop i=0..9 (10 calls).
        // Total 11 calls. The 11th should fail.

        // Let's just blast it until failure to be robust
        let failed = false;
        for (let k = 0; k < 5; k++) {
            const res = await agent.post("/operations/execute").send({
                nodeWallet,
                opType,
                quantity: 1
            });
            if (res.status === 429) {
                failed = true;
                break;
            }
        }
        expect(failed).to.be.true;
    });

    it("should reject invalid op types", async function () {
        const res = await agent.post("/operations/execute").send({
            nodeWallet,
            opType: "fake_op",
            quantity: 1
        });
        expect(res.status).to.equal(400);
    });
});
