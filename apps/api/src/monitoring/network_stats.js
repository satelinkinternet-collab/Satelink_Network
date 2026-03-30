/**
 * Retrieves aggregated network statistics directly from the database schema.
 * Respects performance rules: No heavy joins and no scanning per-request.
 * EVERY call executes fresh DB queries — zero caching.
 */
export async function getNetworkStats(db) {
    console.log("LIVE DB QUERY EXECUTED", Date.now());

    // Fetch nodes count — fresh read every call
    const nodesInfo = await db.prepare(`
        SELECT
            COUNT(*) as nodes_total,
            SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as nodes_active
        FROM registered_nodes
    `).get();

    // Fetch latest epoch ID (most recent, regardless of status)
    const currentEpoch = await db.prepare(`
        SELECT id, status FROM epochs ORDER BY id DESC LIMIT 1
    `).get();

    // Fetch total revenue and ops from revenue_events_v2 (real data source)
    const revenueInfo = await db.prepare(`
        SELECT
            COALESCE(SUM(amount_usdt), 0) as rev_total,
            COUNT(*) as ops_total
        FROM revenue_events_v2
    `).get();

    // Fetch last finalized epoch timestamp
    const lastEpoch = await db.prepare(`
        SELECT ends_at as closed_at
        FROM epochs
        WHERE status = 'FINALIZED'
        ORDER BY ends_at DESC LIMIT 1
    `).get();

    // Read settlement mode from system_config if table exists, else default
    let settlementMode = 'SIMULATED';
    try {
        const modeRow = await db.prepare(
            `SELECT value FROM system_config WHERE key = 'settlement_mode' LIMIT 1`
        ).get();
        if (modeRow?.value) settlementMode = modeRow.value;
    } catch (_) {
        // system_config table may not exist yet — default is safe
    }

    return {
        totalNodes: Number(nodesInfo?.nodes_total || 0),
        activeNodes: Number(nodesInfo?.nodes_active || 0),
        currentEpoch: currentEpoch?.id || 0,
        epochStatus: currentEpoch?.status || 'NONE',
        totalRevenueUsdt: Number(revenueInfo?.rev_total || 0),
        totalOpsProcessed: Number(revenueInfo?.ops_total || 0),
        lastEpochClosedAt: lastEpoch?.closed_at || null,
        settlementMode,
        _ts: Date.now()
    };
}
