export class DensityService {
    constructor(db) {
        this.db = db;
    }

    async runDailyJob() {
        console.log('[Density] Starting analysis...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyymmdd = parseInt(yesterday.toISOString().slice(0, 10).replace(/-/g, ''));

        await this.computeDailyDensity(yyyymmdd);
    }

    async computeDailyDensity(yyyymmdd) {
        // Time window
        const dateStr = `${Math.floor(yyyymmdd / 10000)}-${Math.floor((yyyymmdd % 10000) / 100)}-${yyyymmdd % 100}`;
        const start = new Date(dateStr).setUTCHours(0, 0, 0, 0);
        const end = start + 86400000;

        // 1. Get all regions from nodes
        const regions = await this.db.query("SELECT DISTINCT region FROM nodes");
        // Also check if we have a region list config? Using DB distinct for now.

        for (const { region } of regions) {
            if (!region) continue;

            // 2. Active Nodes in Region (Yesterday)
            // Ideally check activity log. 
            // Simplified: Nodes with status 'online' OR last_seen recently.
            // Let's use `nodes` table count for now, assuming mostly accurate.
            // Better: Count distinct nodes from `op_counts` in this region?
            // `op_counts` links to node_id. We need to join `nodes` to get region.

            const activeNodesRow = await this.db.get(`
                SELECT COUNT(DISTINCT n.node_id) as count
                FROM nodes n
                JOIN op_counts oc ON n.node_id = oc.node_id
                JOIN epochs e ON oc.epoch_id = e.id
                WHERE n.region = ? AND e.starts_at >= ? AND e.ends_at < ?
            `, [region, start / 1000, end / 1000]);

            // If op_counts is empty (no traffic), fallback to just "registered nodes in region"
            // But we want "active".
            let activeNodes = activeNodesRow?.count || 0;

            // If 0 active by ops, checking if any heartbeat?
            // Use `nodes` table count as fallback for "Available Capacity"
            if (activeNodes === 0) {
                const registered = await this.db.get("SELECT COUNT(*) as c FROM nodes WHERE region = ?", [region]);
                // If registered > 0 but active=0 -> Utilization is 0.
            }

            // 3. Total Ops in Region
            const opsRow = await this.db.get(`
                 SELECT SUM(oc.total_ops) as total
                 FROM op_counts oc
                 JOIN nodes n ON oc.node_id = n.node_id
                 JOIN epochs e ON oc.epoch_id = e.id
                 WHERE n.region = ? AND e.starts_at >= ? AND e.ends_at < ?
            `, [region, start / 1000, end / 1000]);
            const opsTotal = opsRow?.total || 0;

            // 4. Revenue in Region (Estimated from Ops?)
            // If revenue_events_v2 has no region, we can attribute revenue proportional to ops?
            // Or if we can join revenue_events to node -> region.
            // Let's assume proportional for now if direct link missing.
            // Or explicit 0 if we can't calculate.
            // Let's try to get global revenue and split by region ops share.
            // (Simple attribution model)
            let regionRevenue = 0;
            if (opsTotal > 0) {
                // Get total revenue
                const totalRev = await this.db.get("SELECT SUM(amount_usdt) as t FROM revenue_events_v2 WHERE created_at >= ? AND created_at < ?", [start, end]);
                const globalOps = await this.db.get("SELECT SUM(total_ops) as t FROM op_counts oc JOIN epochs e ON oc.epoch_id = e.id WHERE e.starts_at >= ? AND e.ends_at < ?", [start / 1000, end / 1000]);

                if ((globalOps?.t || 0) > 0) {
                    regionRevenue = (totalRev?.t || 0) * (opsTotal / globalOps.t);
                }
            }

            // 5. Ratios
            const opsPerNode = activeNodes > 0 ? opsTotal / activeNodes : 0;
            const revPerNode = activeNodes > 0 ? regionRevenue / activeNodes : 0;
            const nodeToOps = opsTotal > 0 ? activeNodes / opsTotal : 0; // Inverse, simpler is ops/node

            // 6. Store
            await this.db.query(`
                INSERT INTO region_density_daily (
                    day_yyyymmdd, region_code, active_nodes, ops_total, revenue_usdt,
                    ops_per_node, revenue_per_node, node_to_ops_ratio, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(day_yyyymmdd, region_code) DO UPDATE SET
                    active_nodes=excluded.active_nodes,
                    ops_total=excluded.ops_total,
                    revenue_usdt=excluded.revenue_usdt,
                    ops_per_node=excluded.ops_per_node
            `, [
                yyyymmdd, region, activeNodes, opsTotal, regionRevenue,
                opsPerNode, revPerNode, nodeToOps, Date.now()
            ]);

            // 7. Check density signals
            if (activeNodes > 0 && opsPerNode < 100) {
                // Low utilization
                console.log(`[Density] Region ${region} under-utilized (${opsPerNode.toFixed(1)} ops/node)`);
            }
        }
    }

    async getHistory(limit = 60) {
        return await this.db.query("SELECT * FROM region_density_daily ORDER BY day_yyyymmdd DESC, ops_total DESC LIMIT ?", [limit]);
    }

    async getLatest() {
        const last = await this.db.get("SELECT MAX(day_yyyymmdd) as d FROM region_density_daily");
        if (!last?.d) return [];
        return await this.db.query("SELECT * FROM region_density_daily WHERE day_yyyymmdd = ? ORDER BY ops_total DESC", [last.d]);
    }
}
