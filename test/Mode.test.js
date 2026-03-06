import { expect } from "chai";
import supertest from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Day-1 Mode System", function () {
    let app, agent, db;

    before(async function () {
        db = new Database(":memory:");
        app = createApp(db);
        agent = supertest(app);
    });

    after(() => {
        db.close();
    });

    describe("GET /health", function () {
        it("should include mode field set to simulate", async function () {
            const res = await agent.get("/health");
            expect(res.status).to.equal(200);
            expect(res.body.ok).to.equal(true);
            expect(res.body).to.have.property("mode");
            expect(res.body.mode).to.equal("simulate");
        });
    });

    describe("GET /api/mode", function () {
        it("should return mode configuration", async function () {
            const res = await agent.get("/api/mode");
            expect(res.status).to.equal(200);
            expect(res.body.ok).to.equal(true);
            expect(res.body.mode).to.equal("simulate");
            expect(res.body.allowed_modes).to.include("simulate");
            expect(res.body.allowed_modes).to.include("live");
            expect(res.body.is_live).to.equal(false);
        });

        it("should describe live_requires constraints", async function () {
            const res = await agent.get("/api/mode");
            expect(res.body.live_requires).to.be.an("object");
            expect(res.body.live_requires.dev_bypass_blocked).to.equal(true);
            expect(res.body.live_requires.test_routes_blocked).to.equal(true);
        });
    });

    describe("Simulate mode allows dev routes", function () {
        it("/__test/auth/login should be reachable (not 404 from guard)", async function () {
            const res = await agent.post("/__test/auth/login").send({});
            // In simulate mode, prod_guard is a no-op. Route handler runs —
            // may return 400/500 (missing body) but NOT 404 from the guard.
            expect(res.status).to.not.equal(404);
        });

        it("/__test/error should be reachable in simulate mode", async function () {
            const res = await agent.get("/__test/error");
            // This triggers a simulated crash -> 500 from error handler
            expect(res.status).to.equal(500);
        });
    });
});
