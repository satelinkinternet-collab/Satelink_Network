
import express from 'express';
import { ReputationEngine } from '../services/reputation_engine.js';

/**
 * Public Marketplace — mounted at /network/marketplace
 * Competitive transparency: top nodes, rising stars, tier distribution.
 */
export function createPublicMarketplaceRouter(db) {
    const router = express.Router();
    const engine = new ReputationEngine(db);

    // GET /network/marketplace
    router.get('/', async (req, res) => {
        try {
            const [top20, rising, reliable, tiers] = await Promise.all([
                engine.getLeaderboard(20),
                engine.getRisingNodes(10),
                engine.getMostReliable(10),
                engine.getTierDistribution()
            ]);

            // Top by region if region data available
            let byRegion = [];
            try {
                byRegion = await db.query(`
                    SELECT nr.node_id, nr.composite_score, nr.tier, ra.region_code
                    FROM node_reputation nr
                    LEFT JOIN region_activation ra ON 1=1
                    ORDER BY nr.composite_score DESC LIMIT 20
                `) || [];
            } catch (e) { /* ignore */ }

            res.json({
                ok: true,
                top_nodes: top20,
                rising_nodes: rising,
                most_reliable: reliable,
                tier_distribution: tiers,
                by_region: byRegion,
                total_ranked: Object.values(tiers).reduce((a, b) => a + b, 0)
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
