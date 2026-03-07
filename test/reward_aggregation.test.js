import assert from 'assert';
import { getGrossRewardUSDT } from '../src/services/rewards.js';
import Database from 'better-sqlite3';

describe('Reward Aggregation', () => {
    let db;

    before(() => {
        db = new Database(':memory:');
        db.exec(`
            CREATE TABLE epoch_earnings (
                epoch_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                wallet_or_node_id TEXT NOT NULL,
                amount_usdt REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'UNPAID',
                created_at BIGINT NOT NULL,
                PRIMARY KEY (epoch_id, role, wallet_or_node_id)
            );
        `);
    });

    after(() => {
        db.close();
    });

    beforeEach(() => {
        db.exec("DELETE FROM epoch_earnings;");
    });

    it('should correctly sum usdt amounts for a given node_operator and period', () => {
        const insert = db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, ?, ?, ?, ?)");

        insert.run(1, 'node_operator', 'op1', 100.5, 1000);
        insert.run(2, 'node_operator', 'op1', 50.25, 1500);
        insert.run(3, 'platform', 'op1', 500, 1500); // Should be ignored (wrong role)
        insert.run(4, 'node_operator', 'op2', 200, 1500); // Should be ignored (wrong wallet)
        insert.run(5, 'node_operator', 'op1', 10, 3000); // Should be ignored (out of time window)

        const res = getGrossRewardUSDT(db, 'op1', 500, 2000);
        assert.strictEqual(res, "150.75000000");
    });

    it('should return 0.00000000 if no records exist', () => {
        const res = getGrossRewardUSDT(db, 'op_empty', 500, 2000);
        assert.strictEqual(res, "0.00000000");
    });
});
