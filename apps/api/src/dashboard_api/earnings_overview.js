/**
 * Dashboard Query Layer — Earnings Overview
 *
 * READ-ONLY aggregated queries for revenue and earnings dashboards.
 * This module NEVER mutates state. All queries are SELECT-only.
 *
 * Tables read: revenue_events_v2, epoch_earnings, epochs
 */

/**
 * Get aggregated earnings overview for dashboards.
 *
 * @param {object} db - Database connection
 * @param {object} [cache] - Optional cache adapter
 * @returns {object} Earnings overview
 */
export async function getEarningsOverview(db, cache) {
    const cacheKey = 'dashboard:earnings_overview';

    if (cache?.get) {
        const cached = await cache.get(cacheKey);
        if (cached) return JSON.parse(cached);
    }

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const sevenDaysAgo = now - 604800;
    const thirtyDaysAgo = now - 2592000;

    // ── Total revenue (all time) ──
    const totalRevenue = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success'"
    )?.get()?.total || 0;

    // ── Revenue by time window ──
    const revenue24h = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success' AND created_at > ?"
    )?.get(oneDayAgo)?.total || 0;

    const revenue7d = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success' AND created_at > ?"
    )?.get(sevenDaysAgo)?.total || 0;

    const revenue30d = db.prepare?.(
        "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE status = 'success' AND created_at > ?"
    )?.get(thirtyDaysAgo)?.total || 0;

    // ── Revenue split (50/30/20) from epoch_earnings ──
    const splitTotals = db.prepare?.(
        `SELECT role, COALESCE(SUM(amount_usdt), 0) as total
         FROM epoch_earnings
         GROUP BY role`
    )?.all() || [];

    const splitMap = {};
    for (const row of splitTotals) {
        splitMap[row.role] = parseFloat(row.total.toFixed(4));
    }

    // ── Revenue by operation type (top 10) ──
    const byOpType = db.prepare?.(
        `SELECT op_type, COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total
         FROM revenue_events_v2
         WHERE status = 'success'
         GROUP BY op_type
         ORDER BY total DESC
         LIMIT 10`
    )?.all() || [];

    // ── Epoch history (last 10 completed epochs) ──
    const recentEpochs = db.prepare?.(
        `SELECT id, status, total_revenue_usdt, node_pool_usdt, platform_share_usdt, distributor_share_usdt
         FROM epochs
         ORDER BY id DESC
         LIMIT 10`
    )?.all() || [];

    // ── Payout status distribution ──
    const payoutStatus = db.prepare?.(
        `SELECT status, COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total
         FROM epoch_earnings
         GROUP BY status`
    )?.all() || [];

    const result = {
        total_revenue: parseFloat(totalRevenue.toFixed(4)),
        revenue_24h: parseFloat(revenue24h.toFixed(4)),
        revenue_7d: parseFloat(revenue7d.toFixed(4)),
        revenue_30d: parseFloat(revenue30d.toFixed(4)),
        split: {
            node_operator: splitMap['node_operator'] || 0,
            platform: splitMap['platform'] || 0,
            distribution_pool: splitMap['distribution_pool'] || 0,
        },
        by_op_type: byOpType.map(r => ({
            op_type: r.op_type,
            count: r.count,
            total_usdt: parseFloat(r.total.toFixed(4)),
        })),
        recent_epochs: recentEpochs,
        payout_status: payoutStatus.map(r => ({
            status: r.status,
            count: r.count,
            total_usdt: parseFloat(r.total.toFixed(4)),
        })),
    };

    if (cache?.set) {
        await cache.set(cacheKey, JSON.stringify(result), 'EX', 30);
    }

    return result;
}
