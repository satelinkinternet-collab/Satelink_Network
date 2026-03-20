import { expect } from 'chai';
import Database from 'better-sqlite3';
import { getNetworkStats } from '../core/network_stats.js';

describe('Network Stats Service', () => {
    let db;

    beforeEach(() => {
        db = new Database(':memory:');

        // Define schemas
        db.exec(`
            CREATE TABLE registered_nodes (
                wallet TEXT PRIMARY KEY,
                active INTEGER DEFAULT 1
            );
            CREATE TABLE epochs (
                id INTEGER PRIMARY KEY,
                total_revenue_usdt NUMERIC,
                status TEXT,
                closed_at TIMESTAMP
            );
            CREATE TABLE node_epoch_earnings (
                node_id TEXT,
                epoch_id INTEGER,
                ops_processed INTEGER,
                PRIMARY KEY (node_id, epoch_id)
            );
        `);
    });

    afterEach(() => {
        if (db) db.close();
    });

    it('should return exact 0s natively if tables are empty', () => {
        const stats = getNetworkStats(db);
        expect(stats).to.deep.equal({
            totalNodes: 0,
            activeNodes: 0,
            currentEpoch: 0,
            totalRevenueUsdt: 0,
            totalOpsProcessed: 0,
            lastEpochClosedAt: null
        });
    });

    it('should calculate live stats accurately over actual data', () => {
        // Nodes (3 total, 2 active)
        const insertNode = db.prepare('INSERT INTO registered_nodes (wallet, active) VALUES (?, ?)');
        insertNode.run('node1', 1);
        insertNode.run('node2', 1);
        insertNode.run('node3', 0);

        // Epochs (Max ID 4, Total Revenue 150 across CLOSED only)
        const insertEpoch = db.prepare('INSERT INTO epochs (id, total_revenue_usdt, status, closed_at) VALUES (?, ?, ?, ?)');
        insertEpoch.run(1, 100, 'CLOSED', '2026-01-01T00:00:00Z');
        insertEpoch.run(2, 50, 'CLOSED', '2026-01-02T00:00:00Z');
        insertEpoch.run(3, 400, 'OPEN', null); // OPEN should not be in sum

        // Node Ops (65 + 35 = 100 ops total)
        const insertOps = db.prepare('INSERT INTO node_epoch_earnings (node_id, epoch_id, ops_processed) VALUES (?, ?, ?)');
        insertOps.run('node1', 1, 65);
        insertOps.run('node1', 2, 35);

        const stats = getNetworkStats(db);

        expect(stats.totalNodes).to.equal(3);
        expect(stats.activeNodes).to.equal(2);

        // Epochs
        expect(stats.currentEpoch).to.equal(3);
        expect(stats.totalRevenueUsdt).to.equal(150);
        expect(stats.lastEpochClosedAt).to.equal('2026-01-02T00:00:00Z');

        // Ops 
        expect(stats.totalOpsProcessed).to.equal(100);
    });
});
