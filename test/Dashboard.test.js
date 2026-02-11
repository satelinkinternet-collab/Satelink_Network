import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Dashboard API Verification", function () {
    let app, agent, db;
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);
    });

    after(() => {
        db.close();
    });

    it("should return public epoch profitability history", async function () {
        const res = await agent.get("/ledger/epochs");
        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;
        expect(res.body.epochs).to.be.an('array');
    });

    it("should return treasury status", async function () {
        const res = await agent.get("/ledger/treasury");
        expect(res.status).to.equal(200);
        expect(res.body.available).to.be.a('number');
    });
});
