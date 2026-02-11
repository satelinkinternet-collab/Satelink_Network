import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("RUNG 2: Zero-Signup Verification", function () {
    let app, agent, db;
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";
    let nodeWallet = "0xZeroSignupUserWalletAddress123456789";

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);

        // Bootstrap a node so it exists
        // Bootstrap a node manually since /nodes/bootstrap-payment seems missing
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`
            INSERT INTO registered_nodes (wallet, last_heartbeat, active, updatedAt)
            VALUES (?, ?, 1, ?)
        `).run(nodeWallet, now, now);
    });

    after(() => {
        db.close();
    });

    it("1. specific node stats endpoint returns correct data", async function () {
        const res = await agent.get(`/integrations/node/${nodeWallet}`);
        expect(res.status).to.equal(200);
        expect(res.body.wallet).to.equal(nodeWallet);
        expect(res.body.is_registered).to.be.true;
        expect(res.body.active).to.be.true; // Bootstrapped nodes are active
        expect(res.body.uptime_score).to.equal(0); // No uptime recorded yet
    });

    it("2. unregistered wallet returns is_registered: false", async function () {
        const res = await agent.get(`/integrations/node/0xUnknownWallet`);
        expect(res.status).to.equal(200);
        expect(res.body.is_registered).to.be.false;
        expect(res.body.active).to.be.false;
    });

    it("3. global epoch stats endpoint works", async function () {
        // Record some stats first
        await agent.post("/heartbeat").send({ nodeWallet });

        const res = await agent.get("/operations/epoch-stats");
        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;
        expect(res.body.stats.active_nodes).to.be.at.least(1);
    });

    it("4. node stats reflect uptime updates", async function () {
        // Heartbeat was sent in previous test, so score should increase
        // Note: heartbeat adds 60s uptime by default if diff is large or 0

        const res = await agent.get(`/integrations/node/${nodeWallet}`);
        expect(res.body.uptime_score).to.be.greaterThan(0);
        expect(res.body.last_heartbeat).to.be.greaterThan(0);
    });
});
