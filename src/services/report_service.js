
export class ReportService {
    constructor(db) {
        this.db = db;
    }

    async generateWeeklyReport() {
        const now = Date.now();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const weekStart = now - oneWeekMs;

        // 1. Avg Active Nodes (Sampled daily?)
        // Approximation: Count unique nodes seen in last 7 days / 1? 
        // Better: Avg of daily active counts.
        let totalDailyActive = 0;
        for (let i = 0; i < 7; i++) {
            const dayStart = weekStart + (i * 24 * 60 * 60 * 1000);
            const dayEnd = dayStart + (24 * 60 * 60 * 1000);
            const daily = await this.db.get("SELECT COUNT(DISTINCT node_id) as c FROM node_heartbeats WHERE timestamp BETWEEN ? AND ?", [dayStart, dayEnd]);
            totalDailyActive += daily.c;
        }
        const activeNodesAvg = Math.round(totalDailyActive / 7);

        // 2. Offline Events (Inferred from errors or logs?)
        // Let's use 'node_offline' errors if they exist, or just zero for MVP if not tracked explicitly yet.
        // We can check error_events for 'Heartbeat Timeout' or similar?
        // Or assume 0 for now if not explicitly tracking events.
        const offlineEvents = 0; // Placeholder until explicit offline event tracking

        // 3. Incidents Count
        const incidents = await this.db.get("SELECT COUNT(*) as c FROM incident_bundles WHERE created_at > ?", [weekStart]);

        // 4. Top Error Stacks
        const topErrors = await this.db.query(`
            SELECT stack_hash, COUNT(*) as c 
            FROM error_events 
            WHERE last_seen_at > ? 
            GROUP BY stack_hash 
            ORDER BY c DESC 
            LIMIT 5
        `, [weekStart]);

        // 5. Slow Queries
        const slowQueries = await this.db.query(`
            SELECT query_normalized, COUNT(*) as c, AVG(duration_ms) as avg_ms
            FROM slow_queries 
            WHERE created_at > ? 
            GROUP BY query_normalized 
            ORDER BY avg_ms DESC 
            LIMIT 5
        `, [weekStart]);

        // 6. Rewards Distributed
        // Sum from ledger where account = USER?
        // Or payout_batches_v2 completed?
        const rewards = await this.db.get(`
            SELECT SUM(total_amount) as total 
            FROM payout_batches_v2 
            WHERE status = 'completed' AND completed_at > ?
        `, [weekStart]);

        // Persist
        await this.db.query(`
            INSERT INTO weekly_network_reports 
            (week_start, active_nodes_avg, offline_events, incidents_count, top_error_stacks_json, top_slow_queries_json, rewards_distributed, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            weekStart,
            activeNodesAvg,
            offlineEvents,
            incidents.c,
            JSON.stringify(topErrors),
            JSON.stringify(slowQueries),
            rewards.total || 0,
            now
        ]);

        return {
            week_start: weekStart,
            active_nodes_avg: activeNodesAvg,
            incidents_count: incidents.c,
            rewards_distributed: rewards.total || 0
        };
    }

    async getLatestReports(limit = 10) {
        return this.db.query("SELECT * FROM weekly_network_reports ORDER BY week_start DESC LIMIT ?", [limit]);
    }
}
