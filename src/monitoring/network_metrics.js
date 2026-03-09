/**
 * Network Metrics (Module 1)
 *
 * Aggregates real-time network statistics from:
 *   - node_registry         (active nodes, capacity)
 *   - workload_metrics      (workloads processed, daily revenue)
 *   - demand_metrics        (incoming demand)
 *
 * All reads are non-blocking; missing tables degrade gracefully to 0.
 *
 * Exposed via: GET /v1/network/metrics
 */

export class NetworkMetrics {
    constructor(db) {
        this.db = db;
    }

    /**
     * Compute and return a full network metrics snapshot.
     *
     * @returns {{
     *   active_nodes,
     *   total_nodes,
     *   workloads_per_second,
     *   network_capacity,
     *   daily_revenue,
     *   available_node_rewards,
     *   capacity_available
     * }}
     */
    snapshot() {
        const nodeStats = this._nodeStats();
        const workloadStats = this._workloadStats();
        const rewardPool = this._rewardPool();

        // workloads_per_second: daily total / 86400
        const wps = workloadStats.daily_total > 0
            ? Math.round((workloadStats.daily_total / 86400) * 1000) / 1000
            : 0;

        return {
            active_nodes: nodeStats.active,
            total_nodes: nodeStats.total,
            workloads_per_second: wps,
            network_capacity: nodeStats.capacity,
            capacity_available: nodeStats.capacity,
            daily_revenue: workloadStats.daily_revenue,
            available_node_rewards: rewardPool
        };
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    _nodeStats() {
        try {
            const rows = this.db.prepare(`
                SELECT status, COUNT(*) as cnt, SUM(capacity) as cap
                FROM node_registry GROUP BY status
            `).all();

            let active = 0, total = 0, capacity = 0;
            for (const r of rows) {
                total += r.cnt;
                if (r.status === 'ACTIVE') { active = r.cnt; capacity = r.cap || 0; }
            }
            return { active, total, capacity };
        } catch (_) {
            return { active: 0, total: 0, capacity: 0 };
        }
    }

    _workloadStats() {
        try {
            const rows = this.db.prepare('SELECT key, value FROM workload_metrics').all();
            const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
            const rpcR = map.rpc_requests || 0;
            const whR = map.webhook_events || 0;
            const autR = map.automation_jobs || 0;
            return {
                daily_total: rpcR + whR + autR,
                daily_revenue: map.daily_revenue || 0
            };
        } catch (_) {
            return { daily_total: 0, daily_revenue: 0 };
        }
    }

    _rewardPool() {
        // Reward pool estimate: 60% of daily revenue distributed to nodes
        const { daily_revenue } = this._workloadStats();
        return Math.round(daily_revenue * 0.6 * 10000) / 10000;
    }
}
