import { expect } from 'chai';
import { finalizeClosedEpochEarnings } from '../src/economics/epoch_finalizer.js';

function makePool({ epoch = { id: 42, total_revenue_usdt: '12' }, nodes = ['node-a', 'node-b', 'node-c'] } = {}) {
    const calls = [];
    const client = {
        calls,
        async query(sql, params = []) {
            const normalized = sql.replace(/\s+/g, ' ').trim();
            calls.push({ sql: normalized, params });

            if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                return { rows: [], rowCount: 0 };
            }

            if (/SELECT id, total_revenue_usdt FROM epochs WHERE id = \$1 AND status = 'CLOSED' FOR UPDATE/.test(normalized)) {
                return epoch ? { rows: [epoch], rowCount: 1 } : { rows: [], rowCount: 0 };
            }

            if (/SELECT DISTINCT node_id FROM revenue_events_v2/.test(normalized)) {
                return { rows: nodes.map((node_id) => ({ node_id })), rowCount: nodes.length };
            }

            if (/WITH split AS/.test(normalized)) {
                const total = Number(params[1]);
                const nodeCount = Number(params[2]);
                return {
                    rows: [{
                        platform_rows_inserted: 1,
                        distribution_rows_inserted: 1,
                        node_rows_inserted: nodeCount,
                        total_revenue_usdt: String(total),
                        node_pool_usdt: String(total * 0.5),
                        platform_share_usdt: String(total * 0.3),
                        distributor_share_usdt: String(total * 0.2)
                    }],
                    rowCount: 1
                };
            }

            throw new Error(`Unexpected SQL: ${normalized}`);
        },
        release() {
            calls.push({ sql: 'release', params: [] });
        }
    };

    return {
        client,
        async connect() {
            return client;
        },
        async query() {
            throw new Error('finalizeClosedEpochEarnings should use a transaction client');
        }
    };
}

describe('finalizeClosedEpochEarnings', () => {
    it('splits a closed epoch into platform, DAO, and equal node operator earnings', async () => {
        const pool = makePool();

        const result = await finalizeClosedEpochEarnings(pool, 42);

        expect(result).to.deep.include({
            ok: true,
            epoch_id: 42,
            total_revenue_usdt: 12,
            node_pool_usdt: 6,
            node_count: 3
        });
        expect(result.platform_share_usdt).to.be.closeTo(3.6, 0.000001);
        expect(result.distributor_share_usdt).to.be.closeTo(2.4, 0.000001);
        expect(result.inserted).to.deep.equal({
            node_operator: 3,
            platform: 1,
            distribution_pool: 1
        });

        const sql = pool.client.calls.map((call) => call.sql);
        expect(sql[0]).to.equal('BEGIN');
        expect(sql).to.include('COMMIT');
        expect(sql.at(-1)).to.equal('release');

        const insertSql = sql.find((entry) => /WITH split AS/.test(entry));
        expect(insertSql).to.include('PLATFORM_TREASURY');
        expect(insertSql).to.include('DAO_POOL');
        expect(insertSql).to.include("'node_operator'");
        expect(insertSql).to.include('ON CONFLICT (epoch_id, role, wallet_or_node_id) DO NOTHING');
        expect(insertSql).to.include('split.node_pool_usdt / split.node_count');
    });

    it('rolls back when the input epoch is not CLOSED', async () => {
        const pool = makePool({ epoch: null });

        try {
            await finalizeClosedEpochEarnings(pool, 99);
            throw new Error('expected finalizeClosedEpochEarnings to fail');
        } catch (error) {
            expect(error.message).to.equal('Closed epoch 99 not found');
        }

        const sql = pool.client.calls.map((call) => call.sql);
        expect(sql).to.include('ROLLBACK');
        expect(sql).to.not.include('COMMIT');
    });
});
