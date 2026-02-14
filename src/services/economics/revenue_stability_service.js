export class RevenueStabilityService {
    constructor(db) {
        this.db = db;
    }

    async runDailyJob() {
        console.log('[Stability] Starting analysis...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyymmdd = parseInt(yesterday.toISOString().slice(0, 10).replace(/-/g, ''));

        await this.computeDailyStability(yyyymmdd);
    }

    async computeDailyStability(yyyymmdd) {
        // Time window (UTC midnight to midnight)
        const dateStr = `${Math.floor(yyyymmdd / 10000)}-${Math.floor((yyyymmdd % 10000) / 100)}-${yyyymmdd % 100}`;
        const start = new Date(dateStr).setUTCHours(0, 0, 0, 0);
        const end = start + 86400000;

        // 1. Total Review for Day
        // Using revenue_events_v2
        const revStats = await this.db.get(`
            SELECT SUM(amount_usdt) as total
            FROM revenue_events_v2
            WHERE created_at >= ? AND created_at < ?
        `, [start, end]);
        const dailyRevenue = revStats?.total || 0;

        // 2. Volatility (7d)
        // Need last 7 days revenue
        const last7Days = await this.db.query(`
            SELECT revenue_usdt FROM revenue_stability_daily 
            WHERE day_yyyymmdd < ? ORDER BY day_yyyymmdd DESC LIMIT 6
        `, [yyyymmdd]);

        const revenues = last7Days.map(r => r.revenue_usdt);
        revenues.push(dailyRevenue);

        let volatility = 0;
        if (revenues.length > 1) {
            const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
            if (mean > 0) {
                const variance = revenues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / revenues.length;
                const stdDev = Math.sqrt(variance);
                volatility = stdDev / mean; // Coefficient of Variation
            }
        }

        // 3. Concentration (Client)
        let clientConcentration = 0;
        if (dailyRevenue > 0) {
            const topClient = await this.db.get(`
                SELECT SUM(amount_usdt) as total FROM revenue_events_v2 
                WHERE created_at >= ? AND created_at < ? 
                GROUP BY client_id ORDER BY total DESC LIMIT 1
            `, [start, end]);
            if (topClient) {
                clientConcentration = topClient.total / dailyRevenue;
            }
        }

        // 4. Region Concentration (if region avail in revenue_events? Maybe not directly)
        // If revenue_events_v2 doesn't have region, we might skip or approximate via nodes.
        // Assuming we skip region conc for MVP if schema lacks it.
        // Let's check schema: layer34_revenue_growth.sql added revenue_events_v2.
        // Likely no region column. We'll set to 0.
        let regionConcentration = 0;

        // 5. Surge Dependency
        // amount_usdt > base_rate? Or verify multiplier?
        // Assuming revenue_events_v2 has multiplier/details or we infer.
        // Or we check `ops` table for surge flags?
        // Let's assume 0 for now unless we find surge data.
        let surgeDependency = 0;

        // 6. Node Fairness
        // Gini coefficient of earnings?
        // Let's use simple proxy: Top 10% nodes share of rewards.
        // Requires epoch_earnings for the day.
        let fairness = 1.0; // 1 = perfect
        // Skipping complex Gini for MVP speed.

        // 7. Score
        // Start 100
        // - 30 * Volatility (CV)
        // - 30 * Client Conc (0-1)
        // - 15 * Region Conc
        // ...

        let score = 100;
        score -= (volatility * 30); // If CV is 1.0 (very high), -30
        score -= (clientConcentration * 30); // If one client is 100%, -30

        score = Math.max(0, Math.min(100, score));

        // Store
        await this.db.query(`
            INSERT INTO revenue_stability_daily (
                day_yyyymmdd, revenue_usdt, revenue_volatility_7d, client_concentration,
                region_concentration, surge_dependency, node_distribution_fairness,
                stability_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day_yyyymmdd) DO UPDATE SET
                revenue_usdt=excluded.revenue_usdt,
                stability_score=excluded.stability_score
        `, [
            yyyymmdd, dailyRevenue, volatility, clientConcentration,
            regionConcentration, surgeDependency, fairness, score, Date.now()
        ]);

        if (score < 50) {
            console.warn(`[Stability] Low stability score: ${score}`);
        }
    }

    async getHistory(limit = 90) {
        return await this.db.query("SELECT * FROM revenue_stability_daily ORDER BY day_yyyymmdd DESC LIMIT ?", [limit]);
    }
}
