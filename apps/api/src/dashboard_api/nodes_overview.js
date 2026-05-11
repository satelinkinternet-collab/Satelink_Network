/**
 * Dashboard Query Layer — Nodes Overview
 *
 * READ-ONLY aggregated queries for node dashboards.
 * This module NEVER mutates state. All queries are SELECT-only.
 *
 * Tables read: registered_nodes, node_uptime, epoch_earnings
 */

/**
 * Get summary for a specific node operator wallet.
 *
 * @param {object} db - Database connection
 * @param {string} wallet - Node operator wallet address
 * @param {object} [cache] - Optional cache adapter
 * @returns {object} Node summary
 */
export async function getNodeSummary(db, wallet, cache) {
    const cacheKey = `dashboard:node_summary:${wallet}`;

    if (cache?.get) {
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);
    }

    // ── Node registration status ──
    const node = await db.prepare(
        "SELECT wallet, node_type, active, is_flagged, last_heartbeat, latency, bandwidth FROM registered_nodes WHERE wallet = ?"
    ).get(wallet) || null;

    if (!node) {
        return { found: false, wallet };
    }

    // ── Total earnings (aggregated) ──
    const totalEarnedRow = await db.prepare(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings WHERE wallet_or_node_id = ? AND role = 'node_operator'"
    ).get(wallet);
    const totalEarned = totalEarnedRow?.total || 0;

    // ── Claimable earnings ──
    const claimableRow = await db.prepare(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings WHERE wallet_or_node_id = ? AND role = 'node_operator' AND status = 'UNPAID'"
    ).get(wallet);
    const claimable = claimableRow?.total || 0;

    // ── Withdrawn earnings ──
    const withdrawnRow = await db.prepare(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings WHERE wallet_or_node_id = ? AND role = 'node_operator' AND status = 'PAID'"
    ).get(wallet);
    const withdrawn = withdrawnRow?.total || 0;

    // ── Recent uptime (last 10 epochs) ──
    const uptime = await db.prepare(
        "SELECT epoch_id, uptime_seconds, score FROM node_uptime WHERE node_wallet = ? ORDER BY epoch_id DESC LIMIT 10"
    ).all(wallet) || [];

    // ── Recent earnings by epoch (last 10) ──
    const earnings = await db.prepare(
        "SELECT epoch_id, amount_usdt, status FROM epoch_earnings WHERE wallet_or_node_id = ? AND role = 'node_operator' ORDER BY epoch_id DESC LIMIT 10"
    ).all(wallet) || [];

    // ── Ops count for this node ──
    const opsCountRow = await db.prepare(
        "SELECT COUNT(*) as count FROM revenue_events_v2 WHERE node_id = ?"
    ).get(wallet);
    const opsCount = opsCountRow?.count || 0;

    const result = {
        found: true,
        wallet: node.wallet,
        node_type: node.node_type,
        active: !!node.active,
        is_flagged: !!node.is_flagged,
        last_heartbeat: node.last_heartbeat,
        latency: node.latency,
        bandwidth: node.bandwidth,
        total_earned: parseFloat(totalEarned.toFixed(4)),
        claimable: parseFloat(claimable.toFixed(4)),
        withdrawn: parseFloat(withdrawn.toFixed(4)),
        ops_count: opsCount,
        uptime,
        earnings,
    };

    if (cache?.set) {
        await cache.set(cacheKey, JSON.stringify(result), 'EX', 15);
    }

    return result;
}

/**
 * Get aggregated admin nodes overview.
 *
 * @param {object} db - Database connection
 * @param {object} [cache] - Optional cache adapter
 * @returns {object} Admin nodes overview
 */
export async function getAdminNodesOverview(db, cache) {
    const cacheKey = 'dashboard:admin_nodes_overview';

    if (cache?.get) {
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);
    }

    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;

    // ── Counts by status ──
    const total = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes"
    )?.get()?.count || 0;

    const active = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes WHERE active = 1 AND last_heartbeat > ?"
    )?.get(fiveMinAgo)?.count || 0;

    const flagged = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes WHERE is_flagged = 1"
    )?.get()?.count || 0;

    const inactive = db.prepare?.(
        "SELECT COUNT(*) as count FROM registered_nodes WHERE active = 0 OR last_heartbeat <= ?"
    )?.get(fiveMinAgo)?.count || 0;

    // ── Type distribution ──
    const byType = db.prepare?.(
        "SELECT node_type, COUNT(*) as count FROM registered_nodes GROUP BY node_type"
    )?.all() || [];

    // ── Top 20 nodes by earnings (lightweight) ──
    const topEarners = db.prepare?.(
        `SELECT wallet_or_node_id as wallet, COALESCE(SUM(amount_usdt), 0) as total_earned
         FROM epoch_earnings
         WHERE role = 'node_operator'
         GROUP BY wallet_or_node_id
         ORDER BY total_earned DESC
         LIMIT 20`
    )?.all() || [];

    // ── Average latency ──
    const avgLatency = db.prepare?.(
        "SELECT COALESCE(AVG(latency), 0) as avg FROM registered_nodes WHERE active = 1 AND latency > 0"
    )?.get()?.avg || 0;

    const result = {
        total,
        active,
        inactive,
        flagged,
        by_type: byType,
        top_earners: topEarners,
        avg_latency_ms: Math.round(avgLatency),
    };

    if (cache?.set) {
        await cache.set(cacheKey, JSON.stringify(result), 'EX', 30);
    }

    return result;
}
