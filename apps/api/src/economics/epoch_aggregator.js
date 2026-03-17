// economics/epoch_aggregator.js
import { FuturesEscrow } from '../settlement/futures_escrow.js';

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

        // 2. Aggregate Revenue from revenue_events_v2 (where executeOp writes)
        const revenueResult = db.prepare(`
            SELECT COALESCE(SUM(amount_usdt), 0) AS totalRevenue
            FROM revenue_events_v2
            WHERE epoch_id = ?
        `).get(epochId);

        const totalRevenue = revenueResult.totalRevenue || 0;
        console.log(`[EpochAggregator] Epoch ${epochId}: totalRevenue=${totalRevenue} USDT`);

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
        console.log(`[EpochAggregator] Epoch ${epochId}: totalNodeOps=${totalNodeOps}, nodes=${opsQuery.length}`);

        // 5. Node Distribution
        const insertEarning = db.prepare(`
            INSERT INTO node_epoch_earnings (node_id, epoch_id, earnings_usdt, ops_processed, weight)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Also write to epoch_earnings (used by opsEngine.getBalance, claims, etc.)
        const insertEpochEarning = db.prepare(`
            INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at)
            VALUES (?, ?, ?, ?, 'UNPAID', ?)
        `);

        const now = Math.floor(Date.now() / 1000);

        // Record platform share in epoch_earnings
        if (totalRevenue > 0) {
            insertEpochEarning.run(epochId, 'platform', 'PLATFORM_TREASURY', platformShare, now);
            insertEpochEarning.run(epochId, 'distribution_pool', 'DAO_POOL', distributorShare, now);
            console.log(`[EpochAggregator] Epoch ${epochId}: platform=${platformShare}, distributor=${distributorShare}`);
        }

        // Prepare balance upsert
        const upsertBalance = db.prepare(`
            INSERT INTO balances (wallet, amount_usdt, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(wallet) DO UPDATE SET
                amount_usdt = amount_usdt + excluded.amount_usdt,
                updated_at = excluded.updated_at
        `);

        if (totalNodeOps > 0) {
            let escrow;
            try {
                escrow = new FuturesEscrow(db);
            } catch (e) {
                escrow = null;
            }

            for (const row of opsQuery) {
                const weight = row.ops;
                let share = (weight / totalNodeOps) * nodePool;

                // INFRASTRUCTURE FUTURES EXPANSION
                // Deduct any forward contract obligations, emitting investor USDT directly.
                if (escrow) {
                    try {
                        share = escrow.settleEpochObligations(epochId, row.node_id, share);
                    } catch (e) {
                        console.warn(`[EpochAggregator] Futures escrow failed for ${row.node_id}:`, e.message);
                    }
                }

                insertEarning.run(
                    row.node_id,
                    epochId,
                    share,
                    row.ops,
                    weight
                );

                // Write to epoch_earnings for the claims/withdrawal flow
                insertEpochEarning.run(epochId, 'node_operator', row.node_id, share, now);

                // Update balances table
                upsertBalance.run(row.node_id, share, Date.now());

                console.log(`[EpochAggregator] Node ${row.node_id}: share=${share.toFixed(6)} USDT, ops=${row.ops}`);
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

        console.log(`[EpochAggregator] Epoch ${epochId} CLOSED successfully`);

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
