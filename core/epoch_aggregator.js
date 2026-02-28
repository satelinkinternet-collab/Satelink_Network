// core/epoch_aggregator.js

/**
 * Epoch Aggregation Engine (V1)
 * Aggregates all RevenueEvents for a given epoch, applies 50/30/20 revenue split, 
 * distributes 50% node pool proportionally based on operations count, persists node earnings, 
 * and marks the epoch as CLOSED.
 *
 * Requirements:
 * 1. Must run inside a single DB transaction.
 * 2. Must lock epoch row using SELECT FOR UPDATE (emulated/supported via SQLite transaction mechanism).
 * 3. Must abort if epoch is not OPEN.
 * 4. Weight model = pure ops count.
 * 5. Handles zero total ops count gracefully without inserting node_epoch_earnings.
 */

export function closeEpoch(db, epochId) {
    if (!epochId) throw new Error("epochId is required");

    let resultSummary = null;

    // Use a deferred transaction to acquire a lock and ensure atomicity 
    // SQLite implements locks at the database level when a transaction begins for writing
    const transaction = db.transaction(() => {
        // 1. Fetch and Lock the epoch row (in SQLite, the transaction itself is the lock for concurrent writes)
        // If we were in Postgres, we'd use FOR UPDATE. However, better-sqlite3 handles this via its synchronous lock.
        const epochRow = db.prepare(`SELECT * FROM epochs WHERE id = ?`).get(epochId);

        if (!epochRow) {
            throw new Error(`Epoch ${epochId} not found`);
        }

        if (epochRow.status !== "OPEN") {
            throw new Error(`Epoch ${epochId} is not OPEN. Current status: ${epochRow.status}`);
        }

        // 2. Aggregate Revenue
        // Fetch sum(amount_usdt) from revenue_events
        const revenueResult = db.prepare(`
            SELECT COALESCE(SUM(amount_usdt), 0) AS totalRevenue 
            FROM revenue_events 
            WHERE epoch_id = ?
        `).get(epochId);

        const totalRevenue = revenueResult.totalRevenue || 0;

        // 3. Apply 50/30/20 split
        const nodePool = totalRevenue * 0.5;
        const platformShare = totalRevenue * 0.3;
        const distributorShare = totalRevenue * 0.2;

        // 4. Calculate Node Ops Counts
        const opsQuery = db.prepare(`
            SELECT user_wallet as node_id, COALESCE(SUM(ops), 0) as ops
            FROM op_counts
            WHERE epoch_id = ?
            AND user_wallet IS NOT NULL
            GROUP BY user_wallet
        `).all(epochId);

        let totalNodeOps = 0;
        for (const row of opsQuery) {
            totalNodeOps += row.ops;
        }

        // 5. Node Distribution
        const insertEarning = db.prepare(`
            INSERT INTO node_epoch_earnings (node_id, epoch_id, earnings_usdt, ops_processed, weight)
            VALUES (?, ?, ?, ?, ?)
        `);

        if (totalNodeOps > 0) {
            for (const row of opsQuery) {
                const weight = row.ops;
                const share = (weight / totalNodeOps) * nodePool;

                insertEarning.run(
                    row.node_id,
                    epochId,
                    share,
                    row.ops,
                    weight
                );
            }
        }

        // 6. Finalize Epoch
        const updateEpoch = db.prepare(`
            UPDATE epochs
            SET 
                total_revenue_usdt = ?,
                node_pool_usdt = ?,
                platform_share_usdt = ?,
                distributor_share_usdt = ?,
                total_node_weight = ?,
                status = 'CLOSED',
                closed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        updateEpoch.run(
            totalRevenue,
            nodePool,
            platformShare,
            distributorShare,
            totalNodeOps,
            epochId
        );

        // Populate return summary
        resultSummary = {
            epoch_id: epochId,
            status: "CLOSED",
            total_revenue_usdt: totalRevenue,
            node_pool_usdt: nodePool,
            platform_share_usdt: platformShare,
            distributor_share_usdt: distributorShare,
            total_node_ops: totalNodeOps,
            nodes_distributed: totalNodeOps > 0 ? opsQuery.length : 0
        };
    });

    // Execute the transaction
    transaction();

    return resultSummary;
}
