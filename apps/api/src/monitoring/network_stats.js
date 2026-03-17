/**
 * Retrieves aggregated network statistics directly from the database schema.
 * Respects performance rules: No heavy joins and no scanning per-request.
 */
export function getNetworkStats(db) {
    // 1 & 2. Node Counts
    const nodesInfo = db.prepare(`
        SELECT 
            COUNT(*) as totalNodes,
            SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as activeNodes 
        FROM registered_nodes
    `).get() || { totalNodes: 0, activeNodes: 0 };

    // 3, 4, 6. Epoch Info (Current Epoch, Total Revenue USDT, Last Close)
    const epochInfo = db.prepare(`
        SELECT 
            MAX(id) as currentEpoch,
            SUM(CASE WHEN status = 'CLOSED' THEN total_revenue_usdt ELSE 0 END) as totalRevenueUsdt,
            MAX(CASE WHEN status = 'CLOSED' THEN closed_at ELSE NULL END) as lastEpochClosedAt
        FROM epochs
    `).get() || { currentEpoch: 0, totalRevenueUsdt: 0, lastEpochClosedAt: null };

    // 5. Total Ops Processed (Aggregated from node_epoch_earnings)
    const opsInfo = db.prepare(`
        SELECT COALESCE(SUM(ops_processed), 0) as totalOpsProcessed 
        FROM node_epoch_earnings
    `).get() || { totalOpsProcessed: 0 };

    return {
        totalNodes: nodesInfo.totalNodes || 0,
        activeNodes: nodesInfo.activeNodes || 0,
        currentEpoch: epochInfo.currentEpoch || 0,
        totalRevenueUsdt: epochInfo.totalRevenueUsdt || 0,
        totalOpsProcessed: opsInfo.totalOpsProcessed || 0,
        lastEpochClosedAt: epochInfo.lastEpochClosedAt || null
    };
}
