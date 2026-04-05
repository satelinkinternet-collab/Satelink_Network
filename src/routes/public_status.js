
import express from 'express';

export function createPublicStatusRouter(db, preflightCheck) {
    const router = express.Router();

    // GET / (mounted at /status AND /network-stats)
    router.get('/', async (req, res) => {
        try {
            const now = Date.now();
            const dayAgo = now - 86400000;

            // System state
            const safeMode = await db.get("SELECT value FROM system_config WHERE key = 'system_state'");
            const isSafeMode = safeMode?.value === 'SAFE_MODE';

            // Open incidents
            const openIncidents = await db.get("SELECT COUNT(*) as c FROM incident_bundles WHERE status = 'open'");
            const hasIncidents = openIncidents?.c > 0;

            // Network stats
            const stats = await db.get(`
                SELECT 
                    (SELECT COUNT(DISTINCT node_wallet) FROM node_uptime 
                     WHERE uptime_seconds > 0 AND epoch_id = (SELECT MAX(id) FROM epochs)) as active_nodes,
                    (SELECT COUNT(*) FROM revenue_events_v2 WHERE created_at > ?) as ops_24h,
                    (SELECT COALESCE(SUM(amount), 0) FROM payout_items_v2 WHERE created_at > ?) as rewards_24h_sim
            `, [dayAgo, dayAgo]);

            // Uptime % (average across all active nodes)
            const uptimeRow = await db.get(`
                SELECT AVG(CASE WHEN uptime_seconds > 86400 THEN 100 
                           ELSE (uptime_seconds * 100.0 / 86400) END) as avg_uptime
                FROM node_uptime 
                WHERE epoch_id = (SELECT MAX(id) FROM epochs) AND uptime_seconds > 0
            `);

            // Total operations all-time
            const totalOps = await db.get("SELECT COUNT(*) as c FROM revenue_events_v2");

            // Build status
            let systemStatus = 'LIVE';
            if (isSafeMode) systemStatus = 'SAFE_MODE';
            else if (hasIncidents) systemStatus = 'DEGRADED';

            res.json({
                status: systemStatus,
                incidents: hasIncidents ? 'Active Issue' : 'None',
                active_nodes: stats?.active_nodes || 0,
                uptime_24h_pct: Math.round((uptimeRow?.avg_uptime || 0) * 10) / 10,
                total_operations_24h: stats?.ops_24h || 0,
                total_operations_all_time: totalOps?.c || 0,
                total_simulated_rewards_24h: stats?.rewards_24h_sim || 0,
                system_status: systemStatus,
                version: 'v0.9.34-beta'
            });
        } catch (e) {
            res.status(500).json({ status: 'UNKNOWN', error: e.message });
        }
    });

    return router;
}
