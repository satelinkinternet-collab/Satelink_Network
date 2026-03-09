import { v4 as uuidv4 } from 'uuid';
import { Rules } from './rules.js';

export class RecommendationEngine {
    constructor(db) {
        this.db = db;
    }

    async run(options = { dryRun: false }) {
        console.log('[AutoOps] Running Recommendation Engine...');
        const systemConfig = await this._getAllConfig();

        await this._runRewardChecks(systemConfig);
        await this._runRegionChecks(systemConfig);
        await this._runNodeChecks(systemConfig);
    }

    async _runRewardChecks(config) {
        // Get latest metrics
        const eco = await this.db.get("SELECT burn_rate, total_revenue FROM unit_economics_daily ORDER BY created_at DESC LIMIT 1");
        const stab = await this.db.get("SELECT stability_score FROM revenue_stability_daily ORDER BY day_yyyymmdd DESC LIMIT 1");

        if (!eco || !stab) return;

        const metrics = {
            burnRate: eco.burn_rate || 0,
            totalRevenue: eco.total_revenue || 0,
            stabilityScore: stab.stability_score || 100
        };

        const rec = Rules.checkRewardProtection(metrics, config);
        if (rec) await this._persistRecommendation(rec);
    }

    async _runRegionChecks(config) {
        // Get density data (mocking p95 latency join for now if not in table)
        // region_density_daily has ops_per_node
        const regions = await this.db.query("SELECT * FROM region_density_daily ORDER BY created_at DESC"); // Needs grouping? Assuming today's snapshot

        // Group by region to get latest
        const latestByRegion = {};
        for (const r of regions) {
            if (!latestByRegion[r.region_code]) latestByRegion[r.region_code] = r;
        }

        for (const r of Object.values(latestByRegion)) {
            const data = {
                region_code: r.region_code,
                avgOpsPerNode: r.ops_per_node,
                p95Latency: 100 // Placeholder until latency metric service is linked
            };
            const rec = Rules.checkRegionCap(data, config);
            if (rec) await this._persistRecommendation(rec);
        }
    }

    async _runNodeChecks(config) {
        // Node Bonus & Churn
        // 1. Top Nodes
        const topNodes = await this.db.query("SELECT node_id, composite_score FROM node_reputation WHERE composite_score > 90 LIMIT 50");
        for (const n of topNodes) {
            const data = { node_id: n.node_id, composite_score: n.composite_score, uptime: 100 }; // mock uptime
            const rec = Rules.checkNodeBonus(data);
            if (rec) await this._persistRecommendation(rec);
        }

        // 2. Churn Risk (Negative Margin > 3 days)
        // Check `node_econ_daily`
        const risks = await this.db.query(`
            SELECT node_id, COUNT(*) as days 
            FROM node_econ_daily 
            WHERE net_usdt < 0 
            GROUP BY node_id 
            HAVING days >= 3
        `);

        for (const r of risks) {
            const data = { node_id: r.node_id, negative_streak_days: r.days };
            const rec = Rules.checkChurnRisk(data);
            if (rec) await this._persistRecommendation(rec);
        }
    }

    async _persistRecommendation(rec) {
        // Dedup: Don't insert if pending recommendation exists for same type/entity
        const existing = await this.db.get(
            "SELECT id FROM ops_recommendations WHERE type = ? AND entity_id = ? AND status = 'pending'",
            [rec.type, rec.entity_id]
        );

        if (existing) return;

        await this.db.query(`
            INSERT INTO ops_recommendations (
                type, entity_type, entity_id, recommendation_json, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            rec.type,
            rec.entity_type,
            rec.entity_id,
            JSON.stringify(rec),
            'pending',
            Date.now()
        ]);

        console.log(`[AutoOps] New Recommendation: ${rec.type} for ${rec.entity_id}`);
    }

    async _getAllConfig() {
        const rows = await this.db.query("SELECT key, value FROM system_config");
        return rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
    }
}
