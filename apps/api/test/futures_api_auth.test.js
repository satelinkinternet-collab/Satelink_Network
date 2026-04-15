import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createFuturesRouter } from '../src/gateway/routes/futures_api.js';

// Pins the P0-15 auth contract for /v1/futures. These tests verify:
//   1. POST / and POST /buy reject unauthenticated callers (401).
//   2. POST / rejects non-node-operator roles (403).
//   3. POST / rejects ownership mismatch (node_id ≠ caller wallet) unless admin.
//   4. POST /buy uses req.user.wallet as buyer (not any body field).
// Anything that loosens these checks must fail these tests first.

// auth_middleware.js reads JWT_SECRET/JWT_ISSUER at module load time, so
// these must be set on the CLI (see the mocha invocation in the PR) OR
// they must be present in .env. We read whatever the module resolved.
const SECRET = process.env.JWT_SECRET;
const ISSUER = process.env.JWT_ISSUER || 'satelink-network';

function signToken({ role = 'node_operator', wallet = '0xnodeop', userId = 'u1' } = {}) {
    return jwt.sign(
        { userId, role, wallet, jti: 'tid', type: 'access' },
        SECRET,
        { expiresIn: '5m', issuer: ISSUER, algorithm: 'HS256' }
    );
}

function makeDb(overrides = {}) {
    return {
        prepare(_sql) {
            return {
                async run() { return { changes: 1 }; },
                async get() { return overrides.getResult ?? { active: 1 }; },
                async all() { return overrides.allResult ?? []; }
            };
        }
    };
}

function buildApp(db, escrow) {
    const app = express();
    app.use(express.json());
    app.use('/v1/futures', createFuturesRouter(db, escrow));
    return app;
}

describe('futures_api — P0-15 auth', () => {
    describe('POST /v1/futures (list contract)', () => {
        it('returns 401 without a JWT', async () => {
            const app = buildApp(makeDb(), {});
            const res = await request(app).post('/v1/futures').send({
                node_id: '0xnodeop', revenue_share: 0.1, epoch_range: [1, 5], price: 100
            });
            expect(res.status).to.equal(401);
        });

        it('returns 403 for a non-node-operator role', async () => {
            const token = signToken({ role: 'distributor_lco', wallet: '0xnodeop' });
            const app = buildApp(makeDb(), {});
            const res = await request(app).post('/v1/futures')
                .set('Authorization', `Bearer ${token}`)
                .send({ node_id: '0xnodeop', revenue_share: 0.1, epoch_range: [1, 5], price: 100 });
            expect(res.status).to.equal(403);
        });

        it('returns 403 when node_id does not match caller wallet', async () => {
            const token = signToken({ role: 'node_operator', wallet: '0xalice' });
            const app = buildApp(makeDb(), {});
            const res = await request(app).post('/v1/futures')
                .set('Authorization', `Bearer ${token}`)
                .send({ node_id: '0xbob', revenue_share: 0.1, epoch_range: [1, 5], price: 100 });
            expect(res.status).to.equal(403);
            expect(res.body.error).to.match(/do not own/);
        });

        it('accepts when node_id matches caller wallet', async () => {
            const token = signToken({ role: 'node_operator', wallet: '0xalice' });
            const app = buildApp(makeDb({ getResult: { active: 1 }, allResult: [] }), {});
            const res = await request(app).post('/v1/futures')
                .set('Authorization', `Bearer ${token}`)
                .send({ node_id: '0xalice', revenue_share: 0.1, epoch_range: [1, 5], price: 100 });
            expect(res.status).to.equal(201);
            expect(res.body.contract_id).to.match(/^fut_/);
        });

        it('accepts when caller is admin even if node_id differs', async () => {
            const token = signToken({ role: 'admin_super', wallet: '0xopsteam' });
            const app = buildApp(makeDb({ getResult: { active: 1 }, allResult: [] }), {});
            const res = await request(app).post('/v1/futures')
                .set('Authorization', `Bearer ${token}`)
                .send({ node_id: '0xcharlie', revenue_share: 0.1, epoch_range: [1, 5], price: 100 });
            expect(res.status).to.equal(201);
        });
    });

    describe('POST /v1/futures/buy (purchase)', () => {
        it('returns 401 without a JWT', async () => {
            const app = buildApp(makeDb(), {});
            const res = await request(app).post('/v1/futures/buy').send({ contract_id: 'fut_x', price: 50 });
            expect(res.status).to.equal(401);
        });

        it('uses caller wallet as buyer — body fields cannot override', async () => {
            const token = signToken({ role: 'node_operator', wallet: '0xinvestor' });
            let observedBuyer = null;
            const escrow = {
                async purchaseContract(buyer) { observedBuyer = buyer; return true; }
            };
            const app = buildApp(makeDb(), escrow);

            const res = await request(app).post('/v1/futures/buy')
                .set('Authorization', `Bearer ${token}`)
                .send({ contract_id: 'fut_x', price: 50, buyer: '0xattacker' });

            expect(res.status).to.equal(200);
            expect(observedBuyer).to.equal('0xinvestor');
            expect(res.body.buyer).to.equal('0xinvestor');
        });
    });
});
