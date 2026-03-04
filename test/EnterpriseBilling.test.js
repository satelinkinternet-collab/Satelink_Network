import { expect } from 'chai';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../app_factory.mjs';

describe('Phase 4: Enterprise Billing & Demand Loop', () => {
    let app, db;
    let apiKey = '';
    let clientId = '';

    before(async () => {
        db = new Database(':memory:');
        app = createApp(db);
    });

    after(() => {
        db.close();
    });

    it('1. Register an Enterprise Client', async () => {
        const res = await request(app)
            .post('/enterprise/register')
            .send({
                companyName: 'Test Corp',
                walletAddress: '0x1111111111111111111111111111111111111111',
                planType: 'PRO'
            });

        expect(res.status).to.equal(200);
        expect(res.body.ok).to.be.true;

        apiKey = res.body.apiKey;
        clientId = res.body.client.clientId;

        expect(res.body.client.planType).to.equal('PRO');
        expect(res.body.client.ratePerOp).to.equal(0.005);
    });

    it('2. Fails to execute Paid Op with 0 balance (402 Payment Required)', async () => {
        const res = await request(app)
            .post('/operations/execute')
            .set('X-Enterprise-Key', apiKey)
            .send({});

        // 402 Payment Required
        expect(res.status).to.equal(402);
        expect(res.body.error).to.include('Insufficient deposit balance');
    });

    it('3. Fails without an API Key (402 Payment Required)', async () => {
        const res = await request(app)
            .post('/operations/execute')
            .send({});

        expect(res.status).to.equal(402);
    });

    it('4. Simulates a direct DB balance credit (Deposited off-chain)', () => {
        db.prepare(`UPDATE enterprise_clients SET deposit_balance = 100 WHERE client_id = ?`).run(clientId);
        const row = db.prepare(`SELECT deposit_balance FROM enterprise_clients WHERE client_id = ?`).get(clientId);
        expect(row.deposit_balance).to.equal(100);
    });

    it('5. Successfully executes a Paid Op and deducts balance', async () => {
        const res = await request(app)
            .post('/operations/execute')
            .set('X-Enterprise-Key', apiKey)
            .send({});

        expect(res.status).to.equal(200);
        expect(res.body.multiplier).to.equal(1.5); // PRO tier
        expect(res.body.cost).to.equal(0.005);

        // Check DB directly
        const client = db.prepare(`SELECT deposit_balance FROM enterprise_clients WHERE client_id = ?`).get(clientId);
        expect(client.deposit_balance).to.be.closeTo(100 - 0.005, 0.0001);
    });

    it('6. Creates a RevenueEvent', () => {
        const event = db.prepare(`SELECT * FROM revenue_events WHERE enterprise_id = ?`).get(clientId);
        expect(event).to.not.be.undefined;
        expect(event.amount).to.equal(0.005);
        expect(event.source).to.equal('API_Gateway_Ops');
    });

    it('7. Returns Demand Analytics Metrics', async () => {
        // Must bypass Admin Auth for the test if it requires a secret, OR use the secret
        const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "test-admin-secret";

        const res = await request(app)
            .get('/api/demand/metrics')
            .set('X-Admin-Key', ADMIN_API_KEY)
            .send();

        expect(res.status).to.equal(200);
        expect(res.body.data.active_clients).to.equal(1);
        expect(res.body.data.revenue_last_24h).to.equal(0.005);
    });
});
