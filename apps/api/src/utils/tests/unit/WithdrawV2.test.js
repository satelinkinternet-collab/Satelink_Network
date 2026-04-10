/**
 * WithdrawV2 Integration Test
 *
 * Tests the full withdraw pipeline:
 *   revenue_event → finalize epoch → claim earnings → withdraw → verify
 *
 * Uses an in-memory mock adapter to avoid real blockchain calls.
 */
import { expect } from 'chai';
import { WithdrawService, WithdrawError } from '../../../services/withdrawService.js';

// ── In-Memory DB Stub ──
// Mimics PgDatabase.prepare().run/get/all interface using plain objects.
class MemoryDB {
    constructor() {
        this.tables = {
            epoch_earnings: [],
            withdrawals_v2: [],
            system_flags: [{ key: 'withdrawals_paused', value: '0' }],
        };
    }

    prepare(sql) {
        const db = this;
        return {
            async run(...args) {
                const params = Array.isArray(args[0]) ? args[0] : args;
                return db._exec(sql, params);
            },
            async get(...args) {
                const params = Array.isArray(args[0]) ? args[0] : args;
                const rows = db._query(sql, params);
                return rows[0] || null;
            },
            async all(...args) {
                const params = Array.isArray(args[0]) ? args[0] : args;
                return db._query(sql, params);
            },
        };
    }

    _exec(sql, params) {
        const upper = sql.toUpperCase().trim();

        // INSERT INTO withdrawals_v2
        if (upper.includes('INSERT INTO WITHDRAWALS_V2')) {
            const existing = this.tables.withdrawals_v2.find(w => w.request_id === params[4]);
            if (existing) throw new Error('UNIQUE constraint: request_id');
            this.tables.withdrawals_v2.push({
                id: params[0],
                user_id: params[1],
                wallet_address: params[2],
                amount_usdt: params[3],
                status: 'PROCESSING',
                request_id: params[4],
                tx_hash: null,
                failure_reason: null,
                created_at: params[5],
                updated_at: params[6],
            });
            return { changes: 1 };
        }

        // UPDATE withdrawals_v2 SET status = 'PAID'
        if (upper.includes('UPDATE WITHDRAWALS_V2') && upper.includes("'PAID'")) {
            const id = params[2]; // tx_hash, updated_at, id
            const w = this.tables.withdrawals_v2.find(r => r.id === id);
            if (w) { w.status = 'PAID'; w.tx_hash = params[0]; w.updated_at = params[1]; }
            return { changes: w ? 1 : 0 };
        }

        // UPDATE withdrawals_v2 SET status = 'FAILED'
        if (upper.includes('UPDATE WITHDRAWALS_V2') && upper.includes("'FAILED'")) {
            const id = params[2];
            const w = this.tables.withdrawals_v2.find(r => r.id === id);
            if (w) { w.status = 'FAILED'; w.failure_reason = params[0]; w.updated_at = params[1]; }
            return { changes: w ? 1 : 0 };
        }

        // UPDATE epoch_earnings SET status = 'PAID'
        if (upper.includes('UPDATE EPOCH_EARNINGS') && upper.includes("'PAID'")) {
            const wallet = params[0];
            for (const e of this.tables.epoch_earnings) {
                if (e.wallet_or_node_id === wallet && e.status === 'CLAIMED') {
                    e.status = 'PAID';
                }
            }
            return { changes: 1 };
        }

        return { changes: 0 };
    }

    _query(sql, params) {
        const upper = sql.toUpperCase().trim();

        // SELECT from withdrawals_v2 WHERE request_id = ?
        if (upper.includes('FROM WITHDRAWALS_V2') && upper.includes('REQUEST_ID')) {
            const id = params[0];
            return this.tables.withdrawals_v2.filter(w => w.request_id === id || w.id === id);
        }

        // SELECT COALESCE(SUM(amount_usdt)) from epoch_earnings WHERE ... CLAIMED
        if (upper.includes('FROM EPOCH_EARNINGS') && upper.includes('CLAIMED')) {
            const wallet = params[0];
            const total = this.tables.epoch_earnings
                .filter(e => e.wallet_or_node_id === wallet && e.status === 'CLAIMED')
                .reduce((sum, e) => sum + e.amount_usdt, 0);
            return [{ total }];
        }

        // SELECT from system_flags
        if (upper.includes('FROM SYSTEM_FLAGS')) {
            const key = params[0];
            return this.tables.system_flags.filter(f => f.key === key);
        }

        // SELECT from withdrawals_v2 WHERE user_id AND created_at (rate limit check)
        if (upper.includes('FROM WITHDRAWALS_V2') && upper.includes('USER_ID')) {
            const userId = params[0];
            const since = params[1];
            return this.tables.withdrawals_v2
                .filter(w => w.user_id === userId && w.created_at >= since)
                .sort((a, b) => b.created_at - a.created_at);
        }

        return [];
    }
}

// ── Mock Settlement Adapter ──
class MockAdapter {
    constructor({ shouldFail = false, txHash = '0xabc123def456' } = {}) {
        this.shouldFail = shouldFail;
        this.txHash = txHash;
        this.calls = [];
    }

    async withdraw({ to, amount }) {
        this.calls.push({ to, amount });
        if (this.shouldFail) throw new Error('Mock settlement failure');
        return { txHash: this.txHash };
    }

    getName() { return 'MOCK'; }
}

// ── Tests ──
describe('WithdrawService — Production Withdraw Pipeline', function () {
    const WALLET = '0x1111111111111111111111111111111111111111';
    const USER_ID = 'user_node_001';

    let db, adapter, service;

    beforeEach(function () {
        db = new MemoryDB();
        adapter = new MockAdapter();
        service = new WithdrawService(db, adapter);
    });

    // ── Simulate full pipeline: revenue → epoch → claim → withdraw ──
    function seedClaimedEarnings(wallet, amount, epochId = 1) {
        db.tables.epoch_earnings.push({
            epoch_id: epochId,
            role: 'node_operator',
            wallet_or_node_id: wallet,
            amount_usdt: amount,
            status: 'CLAIMED',
            created_at: Date.now() - 60000,
        });
    }

    describe('Happy Path', function () {
        it('should process a withdrawal end-to-end', async function () {
            // Step 1: Seed a claimed earning (simulates revenue → epoch → claim)
            seedClaimedEarnings(WALLET, 5.00);

            // Step 2: Call withdraw
            const result = await service.processWithdraw({
                userId: USER_ID,
                walletAddress: WALLET,
                requestId: 'req_withdraw_001',
            });

            // Step 3: Verify result
            expect(result.status).to.equal('PAID');
            expect(result.txHash).to.equal('0xabc123def456');
            expect(result.amount).to.equal(5.00);
            expect(result.idempotent).to.equal(false);

            // Step 4: Verify withdrawal record in DB
            const record = db.tables.withdrawals_v2[0];
            expect(record.status).to.equal('PAID');
            expect(record.tx_hash).to.equal('0xabc123def456');
            expect(record.user_id).to.equal(USER_ID);
            expect(record.wallet_address).to.equal(WALLET);

            // Step 5: Verify epoch_earnings updated to PAID
            const earning = db.tables.epoch_earnings[0];
            expect(earning.status).to.equal('PAID');

            // Step 6: Verify adapter was called correctly
            expect(adapter.calls).to.have.length(1);
            expect(adapter.calls[0].to).to.equal(WALLET);
            expect(adapter.calls[0].amount).to.equal(5.00);
        });
    });

    describe('Idempotency', function () {
        it('should return existing result on duplicate requestId', async function () {
            seedClaimedEarnings(WALLET, 3.00);

            // First call
            const first = await service.processWithdraw({
                userId: USER_ID,
                walletAddress: WALLET,
                requestId: 'req_idempotent_001',
            });
            expect(first.status).to.equal('PAID');
            expect(first.idempotent).to.equal(false);

            // Second call — same requestId
            const second = await service.processWithdraw({
                userId: USER_ID,
                walletAddress: WALLET,
                requestId: 'req_idempotent_001',
            });
            expect(second.status).to.equal('PAID');
            expect(second.idempotent).to.equal(true);
            expect(second.txHash).to.equal(first.txHash);

            // Adapter should only have been called once
            expect(adapter.calls).to.have.length(1);
        });
    });

    describe('No Balance', function () {
        it('should reject when no CLAIMED balance exists', async function () {
            try {
                await service.processWithdraw({
                    userId: USER_ID,
                    walletAddress: WALLET,
                    requestId: 'req_no_balance_001',
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err).to.be.instanceOf(WithdrawError);
                expect(err.code).to.equal('NO_BALANCE');
            }
        });

        it('should not withdraw UNPAID earnings (only CLAIMED)', async function () {
            // Seed an UNPAID earning — should not be withdrawable
            db.tables.epoch_earnings.push({
                epoch_id: 1,
                role: 'node_operator',
                wallet_or_node_id: WALLET,
                amount_usdt: 10.00,
                status: 'UNPAID',
                created_at: Date.now(),
            });

            try {
                await service.processWithdraw({
                    userId: USER_ID,
                    walletAddress: WALLET,
                    requestId: 'req_unpaid_001',
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err.code).to.equal('NO_BALANCE');
            }
        });
    });

    describe('Settlement Failure', function () {
        it('should mark withdrawal as FAILED when adapter throws', async function () {
            seedClaimedEarnings(WALLET, 2.50);

            // Use a failing adapter
            const failAdapter = new MockAdapter({ shouldFail: true });
            const failService = new WithdrawService(db, failAdapter);

            try {
                await failService.processWithdraw({
                    userId: USER_ID,
                    walletAddress: WALLET,
                    requestId: 'req_fail_001',
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err.code).to.equal('SETTLEMENT_FAILED');
            }

            // Verify withdrawal marked FAILED
            const record = db.tables.withdrawals_v2[0];
            expect(record.status).to.equal('FAILED');
            expect(record.failure_reason).to.include('Mock settlement failure');

            // Verify epoch_earnings NOT changed to PAID (still CLAIMED)
            const earning = db.tables.epoch_earnings[0];
            expect(earning.status).to.equal('CLAIMED');
        });
    });

    describe('System Paused', function () {
        it('should reject when withdrawals_paused flag is set', async function () {
            seedClaimedEarnings(WALLET, 1.00);
            db.tables.system_flags = [{ key: 'withdrawals_paused', value: '1' }];

            try {
                await service.processWithdraw({
                    userId: USER_ID,
                    walletAddress: WALLET,
                    requestId: 'req_paused_001',
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err.code).to.equal('WITHDRAWALS_PAUSED');
            }

            // No withdrawal record should be created
            expect(db.tables.withdrawals_v2).to.have.length(0);
        });
    });

    describe('Max Amount Guard', function () {
        it('should reject withdrawals exceeding 10,000 USDT', async function () {
            seedClaimedEarnings(WALLET, 15000);

            try {
                await service.processWithdraw({
                    userId: USER_ID,
                    walletAddress: WALLET,
                    requestId: 'req_max_001',
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err.code).to.equal('EXCEEDS_MAX');
            }
        });
    });

    describe('Double Withdraw Prevention', function () {
        it('should not allow withdrawing already-PAID earnings', async function () {
            // Seed a PAID earning (already withdrawn)
            db.tables.epoch_earnings.push({
                epoch_id: 1,
                role: 'node_operator',
                wallet_or_node_id: WALLET,
                amount_usdt: 5.00,
                status: 'PAID',
                created_at: Date.now(),
            });

            try {
                await service.processWithdraw({
                    userId: USER_ID,
                    walletAddress: WALLET,
                    requestId: 'req_double_001',
                });
                expect.fail('Should have thrown');
            } catch (err) {
                expect(err.code).to.equal('NO_BALANCE');
            }
        });
    });
});
