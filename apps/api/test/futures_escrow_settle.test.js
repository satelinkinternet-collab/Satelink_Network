import { expect } from 'chai';
import { FuturesEscrow } from '../src/settlement/futures_escrow.js';

// Pins the async contract between FuturesEscrow.settle() and its sole caller
// in economics/epoch_aggregator.js:92 — which awaits settle() and expects a
// numeric remainder. If settle() becomes sync again, or if a future refactor
// returns a non-number, these tests fail.

function makeMockDb(rows) {
    const calls = [];
    return {
        calls,
        prepare(sql) {
            return {
                async run(...args) {
                    calls.push({ kind: 'run', sql, args });
                    return { changes: 1 };
                },
                async get(...args) {
                    calls.push({ kind: 'get', sql, args });
                    if (/epoch_end = \?/.test(sql)) return { '?column?': 1 };
                    return rows[0];
                },
                async all(...args) {
                    calls.push({ kind: 'all', sql, args });
                    return rows;
                }
            };
        }
    };
}

describe('FuturesEscrow.settle — async contract', () => {
    it('returns a Promise (settle is async)', () => {
        const db = makeMockDb([]);
        const escrow = new FuturesEscrow(db);
        const result = escrow.settle(1, 'node-a', 100);
        expect(result).to.be.an.instanceof(Promise);
    });

    it('resolves to the full original amount when no active contracts exist', async () => {
        const db = makeMockDb([]);
        const escrow = new FuturesEscrow(db);

        const remaining = await escrow.settle(1, 'node-a', 100);

        expect(remaining).to.be.a('number');
        expect(remaining).to.equal(100);
    });

    it('deducts investor cut proportionally to revenue_share and returns the numeric remainder', async () => {
        const db = makeMockDb([
            { contract_id: 'c1', revenue_share: 0.25, buyer_wallet: '0xinvestor1' }
        ]);
        const escrow = new FuturesEscrow(db);

        const remaining = await escrow.settle(5, 'node-a', 100);

        expect(remaining).to.be.a('number');
        expect(remaining).to.equal(75); // 100 - (100 * 0.25)
    });

    it('aggregates multiple active contracts correctly', async () => {
        const db = makeMockDb([
            { contract_id: 'c1', revenue_share: 0.10, buyer_wallet: '0xa' },
            { contract_id: 'c2', revenue_share: 0.15, buyer_wallet: '0xb' }
        ]);
        const escrow = new FuturesEscrow(db);

        const remaining = await escrow.settle(5, 'node-a', 200);

        expect(remaining).to.equal(150); // 200 - (200*0.10) - (200*0.15)
    });

    it('issues DB writes for each active contract (revenue_events + futures_metrics)', async () => {
        const db = makeMockDb([
            { contract_id: 'c1', revenue_share: 0.5, buyer_wallet: '0xa' }
        ]);
        const escrow = new FuturesEscrow(db);

        await escrow.settle(5, 'node-a', 40);

        const revenueInserts = db.calls.filter(c => /INSERT INTO revenue_events/.test(c.sql));
        const metricsUpdates = db.calls.filter(c => /UPDATE futures_metrics/.test(c.sql));
        expect(revenueInserts, 'expected investor yield INSERT').to.have.length(1);
        expect(metricsUpdates, 'expected investors_paid_out UPDATE').to.have.length(1);
    });
});
