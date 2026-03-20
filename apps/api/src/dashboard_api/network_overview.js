/**
 * Dashboard Query Layer — Network Overview
 *
 * READ-ONLY aggregated queries for the network overview dashboard.
 * This module NEVER mutates state. All queries are SELECT-only.
 *
 * Tables read: registered_nodes, node_uptime, revenue_events_v2, epochs
 */

/**
 * @param {object} db - Database connection (UniversalDB)
 * @param {object} [cache] - Optional cache adapter (future Redis)
 * @returns {object} Network overview data
 */
export async function getNetworkOverview(db, cache) {
    const cacheKey = 'dashboard:network_overview';

    // ── Cache check (future Redis) ──
    if (cache?.get) {
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);
    }

    // ── Total nodes ──
    const totalNodes = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes"
    )?.get()?.count || 0;

    // ── Active nodes (heartbeat within last 5 minutes) ──
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    const activeNodes = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes WHERE active = 1 AND last_heartbeat > ?"
    )?.get(fiveMinAgo)?.count || 0;

    // ── Flagged / jailed nodes ──
    const flaggedNodes = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes WHERE is_flagged = 1"
    )?.get()?.count || 0;

    // ── Current epoch ──
    const currentEpoch = db.prepare?.(
        "SELECT id, status, total_revenue_usdt FROM epochs ORDER BY id DESC LIMIT 1"
    )?.get() || { id: 0, status: 'UNKNOWN', total_revenue_usdt: 0 };

    // ── Total revenue (all time, aggregated) ──
    const totalRevenue = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success'"
    )?.get()?.total || 0;

    // ── Revenue last 24h ──
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    const revenue24h = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success' AND created_at > ?"
    )?.get(oneDayAgo)?.total || 0;

    // ── Ops count last 24h ──
    const ops24h = db.prepare?.(
        "SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at > ?"
    )?.get(oneDayAgo)?.count || 0;

    // ── Node type distribution ──
    const nodeTypes = db.prepare?.(
        "SELECT node_type, COUNT(*) as count FROM registered_nodes GROUP BY node_type"
    )?.all() || [];

    // ── Network health score ──
    const healthPct = totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 100) : 0;
    const networkHealth = healthPct >= 90 ? 'healthy' : healthPct >= 70 ? 'degraded' : 'critical';

    const result = {
        total_nodes: totalNodes,
        active_nodes: activeNodes,
        flagged_nodes: flaggedNodes,
        total_revenue: parseFloat(totalRevenue.toFixed(4)),
        revenue_24h: parseFloat(revenue24h.toFixed(4)),
        ops_24h: ops24h,
        epoch_id: currentEpoch.id,
        epoch_status: currentEpoch.status,
        network_health: networkHealth,
        health_pct: healthPct,
        node_types: nodeTypes,
    };

    // ── Cache set (future Redis, TTL 30s) ──
    if (cache?.set) {
        await cache.set(cacheKey, JSON.stringify(result), 'EX', 30);
    }

    return result;
}
