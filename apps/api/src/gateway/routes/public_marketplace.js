
import express from 'express';
import { ReputationEngine } from '../../nodes/reputation_engine.js';

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

    // GET /network/marketplace/pricing — workload pricing catalog
    router.get('/pricing', (req, res) => {
        const catalog = [
            { type: 'rpc_call', display: 'RPC Relay', price_usdt: 0.0003, unit: 'per request', chains: ['ethereum', 'polygon', 'fuse', 'arbitrum', 'bsc', 'base'] },
            { type: 'ai_inference', display: 'AI Inference', price_usdt: 0.03, unit: 'per inference (base)', note: 'Price varies by model' },
            { type: 'webhook_delivery', display: 'Webhook Delivery', price_usdt: 0.001, unit: 'per delivery' },
            { type: 'automation_job', display: 'Automation Job', price_usdt: 0.01, unit: 'per step' },
            { type: 'data_processing', display: 'Data Processing', price_usdt: 0.05, unit: 'per task' },
            { type: 'oracle_fetch', display: 'Oracle Data Feed', price_usdt: 0.002, unit: 'per fetch' },
            { type: 'overflow_compute', display: 'Overflow Compute', price_usdt: 0.40, unit: 'per task (min)' }
        ];
        res.json({ ok: true, workloads: catalog });
    });

    // GET /network/marketplace/supply — network supply stats
    router.get('/supply', async (req, res) => {
        try {
            let activeNodes = 0, totalCapacity = 0, avgReputation = 0;
            try {
                const stats = db.prepare(`
                    SELECT COUNT(*) as active_nodes,
                           COALESCE(SUM(max_jobs), 0) as total_capacity,
                           COALESCE(AVG(reputation), 0) as avg_reputation
                    FROM nodes WHERE status = 'active'
                `).get();
                activeNodes = stats.active_nodes;
                totalCapacity = stats.total_capacity;
                avgReputation = Math.round(stats.avg_reputation * 100) / 100;
            } catch (e) { /* table may not exist yet */ }

            let tiers = {};
            try { tiers = await engine.getTierDistribution(); } catch (e) {}

            res.json({
                ok: true,
                supply: { active_nodes: activeNodes, total_job_capacity: totalCapacity, avg_reputation_score: avgReputation, tier_distribution: tiers }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // GET /network/marketplace/demand — demand-side stats
    router.get('/demand', (req, res) => {
        try {
            let workloadMetrics = {};
            try {
                const rows = db.prepare('SELECT key, value FROM workload_metrics').all();
                for (const { key, value } of rows) workloadMetrics[key] = value;
            } catch (e) {}

            let demandStats = {};
            try {
                const rows = db.prepare('SELECT key, value FROM demand_metrics').all();
                for (const { key, value } of rows) demandStats[key] = value;
            } catch (e) {}

            res.json({ ok: true, demand: { workload_totals: workloadMetrics, demand_layer: demandStats } });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}
