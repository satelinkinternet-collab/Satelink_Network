import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../app_factory.mjs';
import { PgDatabase } from '../src/database/pg_adapter.js';

describe('Withdrawal API', () => {
    let app;
    let db;

    before(async () => {
        // Use an in-memory or temporary DB for testing if possible, 
        // but here we'll assume a local postgres or mock the DB.
        // For simplicity in this environment, we'll use the existing pg_adapter 
        // but we might need to point it to a test database.
        const TEST_DB_URL = process.env.DATABASE_URL || 'postgres://satelink:satelinkpassword@localhost:5432/satelink';
        db = await PgDatabase.create(TEST_DB_URL);
        app = await createApp(db);
    });

    it('should create a withdrawal successfully', async () => {
        const payload = {
            wallet: '0x1234567890123456789012345678901234567890',
            amount_usdt: 50.5
        };

        const res = await request(app)
            .post('/api/withdraw')
            .send(payload);

        expect(res.status).to.equal(201);
        expect(res.body.ok).to.be.true;
        expect(res.body.id).to.be.a('string');
        
        // Verify in DB
        const row = await db.prepare("SELECT * FROM withdrawals WHERE id = ?").get([res.body.id]);
        expect(row).to.not.be.null;
        expect(row.wallet).to.equal(payload.wallet);
        expect(row.amount_usdt).to.equal(payload.amount_usdt);
        expect(row.status).to.equal('PENDING');
    });

    it('should fail with invalid wallet', async () => {
        const res = await request(app)
            .post('/api/withdraw')
            .send({ wallet: '', amount_usdt: 10 });

        expect(res.status).to.equal(400);
        expect(res.body.ok).to.be.false;
    });

    it('should fail with invalid amount', async () => {
        const res = await request(app)
            .post('/api/withdraw')
            .send({ wallet: '0x123', amount_usdt: -5 });

        expect(res.status).to.equal(400);
        expect(res.body.ok).to.be.false;
    });
});
