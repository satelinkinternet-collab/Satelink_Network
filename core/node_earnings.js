// core/node_earnings.js

/**
 * Node Earnings Read API Service
 * Fetches pre-aggregated earnings data directly from node_epoch_earnings and node_claims.
 * Rounds to 6 decimal precision. Never reads raw RevenueEvents. 
 */

export function getAggregatedNodeEarnings(db, nodeId) {
    if (!nodeId) throw new Error("nodeId is required");

    // Helper functions
    const toPrecision = (num) => Number(parseFloat(num || 0).toFixed(6));
    const safeNum = (num) => typeof num === 'number' ? num : 0;

    // A. Lifetime Earnings
    const lifetimeQuery = db.prepare(`
        SELECT COALESCE(SUM(earnings_usdt), 0) AS total
        FROM node_epoch_earnings
        WHERE node_id = ?
    `).get(nodeId);

    const lifetimeEarningsUsdt = lifetimeQuery.total || 0;

    // B. Current Epoch Earnings (Most recent Closed Epoch)
    const currentEpochQuery = db.prepare(`
        SELECT COALESCE(earnings_usdt, 0) AS earnings
        FROM node_epoch_earnings
        WHERE node_id = ?
        AND epoch_id = (
            SELECT MAX(id) FROM epochs WHERE status = 'CLOSED'
        )
    `).get(nodeId);

    const currentEpochEarningsUsdt = currentEpochQuery ? currentEpochQuery.earnings : 0;

    // C. Total Claimed
    const claimedQuery = db.prepare(`
        SELECT COALESCE(SUM(amount_usdt), 0) AS total
        FROM node_claims
        WHERE node_id = ?
    `).get(nodeId);

    const totalClaimed = claimedQuery.total || 0;

    // D. Total Ops Processed
    const opsQuery = db.prepare(`
        SELECT COALESCE(SUM(ops_processed), 0) AS total
        FROM node_epoch_earnings
        WHERE node_id = ?
    `).get(nodeId);

    const totalOpsProcessed = opsQuery.total || 0;

    // E. Earnings History (For Chart)
    const historyQuery = db.prepare(`
        SELECT epoch_id, earnings_usdt
        FROM node_epoch_earnings
        WHERE node_id = ?
        ORDER BY epoch_id ASC
    `).all(nodeId);

    const earningsByEpoch = historyQuery.map(row => ({
        epochId: row.epoch_id,
        earningsUsdt: toPrecision(row.earnings_usdt)
    }));

    // Computed: Claimable
    let claimableUsdt = lifetimeEarningsUsdt - totalClaimed;
    if (claimableUsdt < 0) claimableUsdt = 0; // clamp to 0

    return {
        nodeId: nodeId,
        lifetimeEarningsUsdt: toPrecision(lifetimeEarningsUsdt),
        currentEpochEarningsUsdt: toPrecision(currentEpochEarningsUsdt),
        claimableUsdt: toPrecision(claimableUsdt),
        totalOpsProcessed: Math.floor(safeNum(totalOpsProcessed)),
        earningsByEpoch: earningsByEpoch
    };
}
