import { expect } from 'chai';
import { EvmAdapter } from '../src/settlement/adapters/EvmAdapter.js';

// Regression guard for the `receipt.datus` typo documented in the audit blueprint
// (P0-01). If anyone reintroduces the typo, `receipt.status` accessors will
// return `undefined` and neither branch fires — these tests will fail.

describe('EvmAdapter.getBatchStatus — receipt.status branching', () => {
    function makeAdapter(txs, receipt) {
        const queries = [];
        const db = {
            query: async (sql, params) => {
                queries.push({ sql, params });
                if (/^\s*SELECT/i.test(sql)) return txs;
                return { rowCount: 1 };
            }
        };
        const adapter = new EvmAdapter(db);
        adapter.provider = {
            getTransactionReceipt: async () => receipt
        };
        return { adapter, queries };
    }

    it('marks a sent tx as confirmed when receipt.status === 1', async () => {
        const { adapter, queries } = makeAdapter(
            [{ id: 7, status: 'sent', tx_hash: '0xabc' }],
            { status: 1 }
        );

        const result = await adapter.getBatchStatus('EVM:testchain:42');

        const confirmed = queries.find(q => /status='confirmed'/.test(q.sql));
        expect(confirmed, 'expected UPDATE setting status=confirmed').to.exist;
        expect(confirmed.params[1]).to.equal(7);
        expect(result.status).to.equal('processing');
    });

    it('marks a sent tx as failed when receipt.status === 0 (reverted)', async () => {
        const { adapter, queries } = makeAdapter(
            [{ id: 8, status: 'sent', tx_hash: '0xdef' }],
            { status: 0 }
        );

        await adapter.getBatchStatus('EVM:testchain:42');

        const failed = queries.find(q => /status='failed'/.test(q.sql));
        expect(failed, 'expected UPDATE setting status=failed').to.exist;
        expect(failed.params[1]).to.equal(8);
    });

    it('leaves a sent tx untouched when receipt is null (not yet mined)', async () => {
        const { adapter, queries } = makeAdapter(
            [{ id: 9, status: 'sent', tx_hash: '0x999' }],
            null
        );

        await adapter.getBatchStatus('EVM:testchain:42');

        const updates = queries.filter(q => /^\s*UPDATE/i.test(q.sql));
        expect(updates, 'no status transition should occur without a receipt').to.have.length(0);
    });

    it('returns completed when every tx is already confirmed', async () => {
        const { adapter } = makeAdapter(
            [
                { id: 1, status: 'confirmed', tx_hash: '0x1' },
                { id: 2, status: 'confirmed', tx_hash: '0x2' }
            ],
            null
        );

        const result = await adapter.getBatchStatus('EVM:testchain:99');
        expect(result.status).to.equal('completed');
    });
});
