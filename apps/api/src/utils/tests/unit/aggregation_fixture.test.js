import { expect } from 'chai';
import Database from 'better-sqlite3';

describe('Economics: Monthly Settlement Aggregation Fixture', () => {
    let db;
    const operatorId = 'op_test_123';

    // Period: Jan 1 2024 to Jan 31 2024
    const periodStart = 1704067200;
    const periodEnd = 1706745599;

    before(() => {
        db = new Database(':memory:');

        // Setup schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS epoch_earnings (
                epoch_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                wallet_or_node_id TEXT NOT NULL,
                amount_usdt REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'UNPAID',
                created_at INTEGER NOT NULL,
                PRIMARY KEY (epoch_id, role, wallet_or_node_id)
            );
        `);
    });

    beforeEach(() => {
        db.prepare('DELETE FROM epoch_earnings').run();
    });

    it('should aggregate only node_operator rewards within the requested period', () => {
        // 1. Inside period (Included)
        db.prepare(`INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, ?, ?, ?, ?)`).run(1, 'node_operator', operatorId, 100.5, periodStart + 100);

        // 2. Inside period, but different role (Excluded)
        db.prepare(`INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, ?, ?, ?, ?)`).run(2, 'distribution_pool', operatorId, 50, periodStart + 200);

        // 3. Inside period, different operator (Excluded)
        db.prepare(`INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, ?, ?, ?, ?)`).run(3, 'node_operator', 'other_op', 300, periodStart + 300);

        // 4. Outside period (Excluded)
        db.prepare(`INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, ?, ?, ?, ?)`).run(4, 'node_operator', operatorId, 200, periodEnd + 100);

        // 5. Another valid entry (Included)
        db.prepare(`INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, ?, ?, ?, ?)`).run(5, 'node_operator', operatorId, 45.2, periodEnd - 100);

        const row = db.prepare(`
            SELECT SUM(amount_usdt) as total
            FROM epoch_earnings
            WHERE role = 'node_operator'
              AND wallet_or_node_id = ?
              AND created_at >= ?
              AND created_at <= ?
        `).get([operatorId, periodStart, periodEnd]);

        const grossRewardUsdt = row && row.total ? Number(row.total) : 0;

        expect(grossRewardUsdt).to.equal(145.7);
    });

    it('should handle zero rewards gracefully', () => {
        const row = db.prepare(`
            SELECT SUM(amount_usdt) as total
            FROM epoch_earnings
            WHERE role = 'node_operator'
              AND wallet_or_node_id = ?
              AND created_at >= ?
              AND created_at <= ?
        `).get([operatorId, periodStart, periodEnd]);

        const grossRewardUsdt = row && row.total ? Number(row.total) : 0;

        expect(grossRewardUsdt).to.equal(0);
    });
});
