import { expect } from 'chai';
import { claimLeafHash, generateClaimsForUnpaidEarnings } from '../src/settlement/claim_generator.js';

function makePool({ unpaidRows = [], existingClaims = new Set() } = {}) {
    const calls = [];
    const insertedClaims = [];
    let updatedRows = 0;

    const client = {
        calls,
        async query(sql, params = []) {
            const normalized = sql.replace(/\s+/g, ' ').trim();
            calls.push({ sql: normalized, params });

            if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                return { rows: [], rowCount: 0 };
            }

            if (/FROM epoch_earnings/.test(normalized) && /FOR UPDATE/.test(normalized)) {
                return { rows: unpaidRows, rowCount: unpaidRows.length };
            }

            if (/INSERT INTO epoch_claims/.test(normalized)) {
                const candidates = JSON.parse(params[0]);
                const rows = [];
                for (const claim of candidates) {
                    const key = `${claim.epoch_id}:${claim.operator_wallet}`;
                    if (existingClaims.has(key)) continue;
                    existingClaims.add(key);
                    insertedClaims.push(claim);
                    rows.push({
                        epoch_id: claim.epoch_id,
                        operator_wallet: claim.operator_wallet,
                        amount_usdt: claim.amount_usdt
                    });
                }
                return { rows, rowCount: rows.length };
            }

            if (/UPDATE epoch_earnings ee SET status = 'CLAIMED'/.test(normalized)) {
                updatedRows = unpaidRows.filter((row) => existingClaims.has(`${row.epoch_id}:${row.operator_wallet}`)).length;
                return { rows: [], rowCount: updatedRows };
            }

            throw new Error(`Unexpected SQL: ${normalized}`);
        },
        release() {
            calls.push({ sql: 'release', params: [] });
        }
    };

    return {
        client,
        insertedClaims,
        get updatedRows() {
            return updatedRows;
        },
        async connect() {
            return client;
        },
        async query() {
            throw new Error('generateClaimsForUnpaidEarnings should use a transaction client');
        }
    };
}

describe('generateClaimsForUnpaidEarnings', () => {
    it('creates idempotent claim records from UNPAID earnings and marks earnings CLAIMED', async () => {
        const pool = makePool({
            unpaidRows: [
                { epoch_id: 10, operator_wallet: 'node-a', amount_usdt: '1.25' },
                { epoch_id: 10, operator_wallet: 'node-a', amount_usdt: '0.75' },
                { epoch_id: 10, operator_wallet: 'node-b', amount_usdt: '3' }
            ]
        });

        const result = await generateClaimsForUnpaidEarnings(pool, { epochId: 10 });

        expect(result).to.deep.include({
            ok: true,
            scanned: 2,
            claims_created: 2,
            earnings_updated: 3
        });
        expect(result.claims).to.deep.equal([
            { epoch_id: 10, operator_wallet: 'node-a', amount_usdt: '2' },
            { epoch_id: 10, operator_wallet: 'node-b', amount_usdt: '3' }
        ]);

        expect(pool.insertedClaims[0]).to.deep.include({
            epoch_id: 10,
            operator_wallet: 'node-a',
            amount_usdt: '2',
            leaf_hash: claimLeafHash(10, 'node-a', '2')
        });

        const sql = pool.client.calls.map((call) => call.sql);
        expect(sql[0]).to.equal('BEGIN');
        expect(sql).to.include('COMMIT');
        expect(sql.at(-1)).to.equal('release');

        const insertSql = sql.find((entry) => /INSERT INTO epoch_claims/.test(entry));
        expect(insertSql).to.include('ON CONFLICT (epoch_id, operator_wallet) DO NOTHING');
        expect(insertSql).to.include('RETURNING epoch_id, operator_wallet, amount_usdt');
    });

    it('does not duplicate existing claims but still marks matching unpaid earnings CLAIMED', async () => {
        const pool = makePool({
            unpaidRows: [{ epoch_id: 11, operator_wallet: 'node-a', amount_usdt: '4' }],
            existingClaims: new Set(['11:node-a'])
        });

        const result = await generateClaimsForUnpaidEarnings(pool, { epochId: 11 });

        expect(result.claims_created).to.equal(0);
        expect(result.earnings_updated).to.equal(1);
        expect(result.claims).to.deep.equal([]);
    });

    it('commits without inserts when no UNPAID earnings exist', async () => {
        const pool = makePool({ unpaidRows: [] });

        const result = await generateClaimsForUnpaidEarnings(pool);

        expect(result).to.deep.equal({
            ok: true,
            scanned: 0,
            claims_created: 0,
            earnings_updated: 0,
            claims: []
        });
        expect(pool.client.calls.map((call) => call.sql)).to.include('COMMIT');
    });
});
