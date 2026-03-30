/**
 * Aggregates Economics Revenue Split information directly from the database schema.
 * Operates purely on `epochs` where `status = 'CLOSED'`.
 */
export async function getEconomicsSummary(db) {
    // 1. Total Allocations (All Closed/Finalized Epochs)
    const totals = await db.prepare(`
        SELECT 
            SUM(total_revenue_usdt) as totalRevenueUsdt,
            SUM(node_pool_usdt) as totalNodePoolUsdt,
            SUM(platform_share_usdt) as totalPlatformShareUsdt,
            SUM(distributor_share_usdt) as totalDistributorShareUsdt
        FROM epochs
        WHERE status IN ('CLOSED', 'FINALIZED')
    `).get() || {};

    const coalesce = (val) => val === null || val === undefined ? 0 : Number(val);

    const totalRevenueUsdt = coalesce(totals.totalrevenueusdt || totals.totalRevenueUsdt);
    const totalNodePoolUsdt = coalesce(totals.totalnodepoolusdt || totals.totalNodePoolUsdt);
    const totalPlatformShareUsdt = coalesce(totals.totalplatformshareusdt || totals.totalPlatformShareUsdt);
    const totalDistributorShareUsdt = coalesce(totals.totaldistributorshareusdt || totals.totalDistributorShareUsdt);

    // 2. Last Closed Epoch Properties
    const lastEpoch = await db.prepare(`
        SELECT id, total_revenue_usdt, ends_at
        FROM epochs
        WHERE status IN ('CLOSED', 'FINALIZED')
        ORDER BY id DESC
        LIMIT 1
    `).get() || { id: 0, total_revenue_usdt: 0, ends_at: null };

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
        lastEpochClosedAt: lastEpoch.ends_at ? new Date(lastEpoch.ends_at * 1000).toISOString() : null
    };
}
