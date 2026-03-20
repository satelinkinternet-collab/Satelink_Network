/**
 * Aggregates Economics Revenue Split information directly from the database schema.
 * Operates purely on `epochs` where `status = 'CLOSED'`.
 */
export function getEconomicsSummary(db) {
    // 1. Total Allocations (All Closed Epochs)
    const totals = db.prepare(`
        SELECT 
            SUM(total_revenue_usdt) as totalRevenueUsdt,
            SUM(node_pool_usdt) as totalNodePoolUsdt,
            SUM(platform_share_usdt) as totalPlatformShareUsdt,
            SUM(distributor_share_usdt) as totalDistributorShareUsdt
        FROM epochs
        WHERE status = 'CLOSED'
    `).get() || {};

    const coalesce = (val) => val === null || val === undefined ? 0 : Number(val);

    const totalRevenueUsdt = coalesce(totals.totalRevenueUsdt);
    const totalNodePoolUsdt = coalesce(totals.totalNodePoolUsdt);
    const totalPlatformShareUsdt = coalesce(totals.totalPlatformShareUsdt);
    const totalDistributorShareUsdt = coalesce(totals.totalDistributorShareUsdt);

    // 2. Last Closed Epoch Properties
    const lastEpoch = db.prepare(`
        SELECT id, total_revenue_usdt, closed_at
        FROM epochs
        WHERE status = 'CLOSED'
        ORDER BY id DESC
        LIMIT 1
    `).get() || { id: 0, total_revenue_usdt: 0, closed_at: null };

    return {
        totalRevenueUsdt,
        totalNodePoolUsdt,
        totalPlatformShareUsdt,
        totalDistributorShareUsdt,
        splitRatio: {
            nodeOperators: 50,
            platform: 30,
            distributors: 20
        },
        lastEpochId: lastEpoch.id || 0,
        lastEpochRevenueUsdt: coalesce(lastEpoch.total_revenue_usdt),
        lastEpochClosedAt: lastEpoch.closed_at || null
    };
}
