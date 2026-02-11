import { expect } from "chai";
import supertest from "supertest";
import { ethers } from "ethers";
import Database from "better-sqlite3";
import { createApp } from "../server.js";

describe("Heartbeat Security Unit Test", function () {
    let agent, db;
    let wallet; // Random wallet for testing

    before(async function () {
        db = new Database(":memory:");
        const app = createApp(db);
        agent = supertest(app);
        wallet = ethers.Wallet.createRandom();
    });

    after(() => {
        db.close();
    });

    const createHeartbeat = async (nonce, stats = { cpu: 10, ram: 20 }) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const statsStr = JSON.stringify(stats);
        const message = `SATELINK_HEARTBEAT
wallet=${wallet.address}
timestamp=${timestamp}
nonce=${nonce}
stats=${statsStr}`;
        const signature = await wallet.signMessage(message);

        return {
            nodeWallet: wallet.address,
            timestamp,
            nonce,
            stats,
            signature
        };
    };

    it("should accept a valid signed heartbeat", async function () {
        const payload = await createHeartbeat(1);
        const res = await agent.post("/heartbeat").send(payload);

        if (res.status !== 200) console.error("Error:", res.body);
        expect(res.status).to.equal(200);
        expect(res.body.status).to.equal("ok");
    });

    it("should reject a heartbeat with missing fields", async function () {
        const res = await agent.post("/heartbeat").send({
            nodeWallet: wallet.address
            // Missing others
        });
        expect(res.status).to.equal(400);
        expect(res.body.error).to.include("Missing fields");
    });

    it("should reject an invalid signature and flag the node", async function () {
        const payload = await createHeartbeat(2);
        const maliciousWallet = ethers.Wallet.createRandom();
        const badSig = await maliciousWallet.signMessage("Found you!");
        payload.signature = badSig;

        const res = await agent.post("/heartbeat").send(payload);
        expect(res.status).to.equal(401);
        expect(res.body.error).to.equal("Signature mismatch");

        // Verify node is flagged
        const node = db.prepare("SELECT is_flagged FROM registered_nodes WHERE wallet = ?").get(wallet.address);
        expect(node.is_flagged).to.equal(1);

        // Reset flag for next tests
        db.prepare("UPDATE registered_nodes SET is_flagged = 0 WHERE wallet = ?").run(wallet.address);
    });

    it("should reject a replayed nonce and flag node", async function () {
        // We already sent nonce 1. Let's try sending 1 again.
        const payload = await createHeartbeat(1);
        const res = await agent.post("/heartbeat").send(payload);
        expect(res.status).to.equal(409);
        expect(res.body.error).to.include("Replay detected");

        const node = db.prepare("SELECT is_flagged FROM registered_nodes WHERE wallet = ?").get(wallet.address);
        expect(node.is_flagged).to.equal(1);

        db.prepare("UPDATE registered_nodes SET is_flagged = 0 WHERE wallet = ?").run(wallet.address);
    });

    it("should reject a lower nonce", async function () {
        const payload = await createHeartbeat(0);
        const res = await agent.post("/heartbeat").send(payload);
        expect(res.status).to.equal(409);

        db.prepare("UPDATE registered_nodes SET is_flagged = 0 WHERE wallet = ?").run(wallet.address);
    });

    it("should accept a higher nonce", async function () {
        // Higher than 1
        const payload = await createHeartbeat(5);
        const res = await agent.post("/heartbeat").send(payload);
        expect(res.status).to.equal(200);
    });

    it("should reject heartbeat from a flagged node (403)", async function () {
        // Flag it manually
        db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run(wallet.address);

        const payload = await createHeartbeat(10);
        const res = await agent.post("/heartbeat").send(payload);
        expect(res.status).to.equal(403);
        expect(res.body.error).to.include("flagged");
    });
});
