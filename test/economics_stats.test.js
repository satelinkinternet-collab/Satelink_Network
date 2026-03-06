import { expect } from 'chai';
import Database from 'better-sqlite3';
import { getEconomicsSummary } from '../core/economics_stats.js';

describe('Economics Stats Service', () => {
    let db;

    beforeEach(() => {
        db = new Database(':memory:');

        // Define schemas
        db.exec(`
            CREATE TABLE epochs (
                id INTEGER PRIMARY KEY,
                total_revenue_usdt NUMERIC,
                node_pool_usdt NUMERIC,
                platform_share_usdt NUMERIC,
                distributor_share_usdt NUMERIC,
                status TEXT,
                closed_at TIMESTAMP
            );
        `);
    });

    afterEach(() => {
        if (db) db.close();
    });

    it('should return exact 0s natively if tables are empty', () => {
        const stats = getEconomicsSummary(db);
        expect(stats).to.deep.equal({
            totalRevenueUsdt: 0,
            totalNodePoolUsdt: 0,
            totalPlatformShareUsdt: 0,
            totalDistributorShareUsdt: 0,
            splitRatio: {
                nodeOperators: 50,
                platform: 30,
                distributors: 20
            },
            lastEpochId: 0,
            lastEpochRevenueUsdt: 0,
            lastEpochClosedAt: null
        });
    });

    it('should calculate economics properly utilizing strictly CLOSED epochs', () => {
        const insertEpoch = db.prepare(`
            INSERT INTO epochs (id, total_revenue_usdt, node_pool_usdt, platform_share_usdt, distributor_share_usdt, status, closed_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertEpoch.run(1, 100, 50, 30, 20, 'CLOSED', '2026-01-01T00:00:00Z');
        insertEpoch.run(2, 200, 100, 60, 40, 'CLOSED', '2026-01-02T00:00:00Z');
        // This OPEN epoch should NOT be included in revenue totals
        insertEpoch.run(3, 400, 200, 120, 80, 'OPEN', null);

        const stats = getEconomicsSummary(db);

        expect(stats.totalRevenueUsdt).to.equal(300);
        expect(stats.totalNodePoolUsdt).to.equal(150);
        expect(stats.totalPlatformShareUsdt).to.equal(90);
        expect(stats.totalDistributorShareUsdt).to.equal(60);

        // Verify it extracts the latest closed epoch (2, not 3)
        expect(stats.lastEpochId).to.equal(2);
        expect(stats.lastEpochRevenueUsdt).to.equal(200);
        expect(stats.lastEpochClosedAt).to.equal('2026-01-02T00:00:00Z');
    });
});
