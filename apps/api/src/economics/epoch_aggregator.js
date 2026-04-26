// economics/epoch_aggregator.js
import { FuturesEscrow } from '../settlement/futures_escrow.js';
import {
    calculateReputationDelta,
    updateNodeReputation,
    getNodeTier
} from '../services/node_registry/reputation_engine.js';

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

export async function closeEpoch(db, epochId) {
    if (!epochId) throw new Error("epochId is required");

    let resultSummary = null;

    // Use a deferred transaction to acquire a lock and ensure atomicity
    await db.transaction(async () => {
        // 1. Fetch and Lock the epoch row (In Postgres, PgDatabase handles the BEGIN/COMMIT logic)
        const epochRow = await db.prepare(`SELECT * FROM epochs WHERE id = ?`).get(epochId);

        if (!epochRow) {
            throw new Error(`Epoch ${epochId} not found`);
        }

        if (epochRow.status !== "OPEN") {
            throw new Error(`Epoch ${epochId} is not OPEN. Current status: ${epochRow.status}`);
        }

        // 2. Aggregate Revenue from revenue_events_v2 (the active revenue table)
        const revenueResult = await db.prepare(`
            SELECT COALESCE(SUM(amount_usdt), 0) AS totalRevenue
            FROM revenue_events_v2
            WHERE epoch_id = ?
        `).get(epochId);

        const totalRevenue = revenueResult.totalRevenue || 0;

        // 3. Apply 50/30/20 split
        const nodePool = totalRevenue * 0.5;
        const platformShare = totalRevenue * 0.3;
        const distributorShare = totalRevenue * 0.2;

        // 4. Calculate Node Ops Counts
        // C-08: Fixed — use user_wallet consistently (not non-existent node_id column)
        // Also query revenue_events_v2 as fallback if op_counts is empty
        let opsQuery = [];
        try {
            opsQuery = await db.prepare(`
                SELECT user_wallet as node_id, COALESCE(SUM(ops), 0) as ops
                FROM op_counts
                WHERE epoch_id = ?
                AND user_wallet IS NOT NULL
                GROUP BY user_wallet
            `).all(epochId);
        } catch (e) {
            // op_counts table may not exist or be empty — fallback to revenue_events_v2
            console.warn(`[epoch_aggregator] op_counts query failed: ${e.message}, falling back to revenue_events_v2`);
        }

        // C-08: Fallback — if op_counts is empty, derive from revenue_events_v2
        if (opsQuery.length === 0) {
            opsQuery = await db.prepare(`
                SELECT node_id, COUNT(*) as ops
                FROM revenue_events_v2
                WHERE epoch_id = ?
                AND node_id IS NOT NULL
                GROUP BY node_id
            `).all(epochId);
        }

        let totalNodeOps = 0;
        for (const row of opsQuery) {
            totalNodeOps += row.ops;
        }

        // 5. Node Distribution
        if (totalNodeOps > 0) {
            const escrow = new FuturesEscrow(db);
            for (const row of opsQuery) {
                const weight = row.ops;
                let share = (weight / totalNodeOps) * nodePool;

                // INFRASTRUCTURE FUTURES EXPANSION
                // Deduct any forward contract obligations, emitting investor USDT directly.
                share = await escrow.settle(epochId, row.node_id, share);

                await db.prepare(`
            INSERT INTO node_epoch_earnings (node_id, epoch_id, earnings_usdt, ops_processed, weight)
            VALUES (?, ?, ?, ?, ?)
        `).run(
                    row.node_id,
                    epochId,
                    share,
                    row.ops,
                    weight
                );
            }
        }

        // 6. Finalize Epoch
        await db.prepare(`
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
        `).run(
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

    // Process reputation updates (non-blocking, outside transaction)
    try {
        const reputationResults = await processEpochReputation(db, epochId, resultSummary);
        resultSummary.reputation_updated = reputationResults.updated;
        resultSummary.tier_changes = reputationResults.tierChanges;
    } catch (repErr) {
        console.error(`[Epoch] Reputation processing failed for epoch ${epochId}:`, repErr.message);
        resultSummary.reputation_error = repErr.message;
    }

    return resultSummary;
}

/**
 * Process reputation updates for all nodes that participated in the epoch.
 */
async function processEpochReputation(db, epochId, epochSummary) {
    const results = { updated: 0, tierChanges: [] };

    try {
        // Get all registered nodes
        let nodes = [];
        try {
            const nodeResult = await db.prepare(`
                SELECT node_id, reputation_score, tier, last_heartbeat_at
                FROM registered_nodes
                WHERE status = 'active'
            `).all([]);
            nodes = nodeResult || [];
        } catch (e) {
            console.warn('[Epoch] registered_nodes query failed:', e.message);
            return results;
        }

        if (nodes.length === 0) {
            console.log('[Epoch] No active nodes for reputation processing');
            return results;
        }

        // Get epoch time boundaries (assuming 1-hour epochs)
        const epochStart = epochId * 3600;
        const epochEnd = epochStart + 3600;
        const expectedHeartbeats = 60; // One per minute

        for (const node of nodes) {
            const nodeId = node.node_id;
            const oldTier = node.tier || 'bronze';
            const oldScore = node.reputation_score || 0;

            // Count heartbeats for this node during epoch
            let heartbeatsReceived = 0;
            if (node.last_heartbeat_at && node.last_heartbeat_at >= epochStart) {
                // Estimate heartbeats based on last_heartbeat_at
                heartbeatsReceived = Math.min(60, Math.max(1, Math.floor((node.last_heartbeat_at - epochStart) / 60)));
            }

            // Count RPC calls served by this node
            let rpcCallsServed = 0;
            try {
                const rpcResult = await db.prepare(`
                    SELECT COUNT(*) as count
                    FROM revenue_events_v2
                    WHERE node_id = ? AND epoch_id = ?
                `).get([nodeId, epochId]);
                rpcCallsServed = rpcResult?.count || 0;
            } catch (e) { /* no revenue data */ }

            // Calculate reputation delta
            const missedHeartbeats = Math.max(0, expectedHeartbeats - heartbeatsReceived);
            const downtimeEvents = missedHeartbeats >= 5 ? Math.floor(missedHeartbeats / 5) : 0;

            const delta = calculateReputationDelta({
                heartbeatsReceived,
                rpcCallsServed,
                missedHeartbeats,
                downtimeEvents,
                slaViolations: 0
            });

            // Skip if no change
            if (delta === 0) continue;

            // Update reputation
            const newScore = Math.max(0, Math.min(1000, oldScore + delta));
            const newTier = getNodeTier(newScore);

            await db.prepare(`
                UPDATE registered_nodes
                SET reputation_score = ?, tier = ?, updated_at = ?
                WHERE node_id = ?
            `).run([newScore, newTier, Math.floor(Date.now() / 1000), nodeId]);

            results.updated++;

            // Track tier changes
            if (newTier !== oldTier) {
                results.tierChanges.push({
                    nodeId,
                    oldTier,
                    newTier,
                    oldScore,
                    newScore
                });
                console.log(`[Epoch] ⭐ Node ${nodeId} tier change: ${oldTier} → ${newTier} (score: ${newScore})`);

                // Send Discord notification for tier upgrades
                await sendTierChangeNotification(nodeId, oldTier, newTier, newScore);
            }
        }

        console.log(`[Epoch] Reputation updated for ${results.updated} nodes, ${results.tierChanges.length} tier changes`);
        return results;
    } catch (err) {
        console.error('[Epoch] Reputation processing error:', err.message);
        throw err;
    }
}

/**
 * Send Discord notification for tier changes.
 */
async function sendTierChangeNotification(nodeId, oldTier, newTier, score) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const isUpgrade = ['bronze', 'silver', 'gold', 'platinum'].indexOf(newTier) >
                      ['bronze', 'silver', 'gold', 'platinum'].indexOf(oldTier);

    const emoji = isUpgrade ? '⭐' : '📉';
    const action = isUpgrade ? 'upgraded' : 'downgraded';
    const color = isUpgrade ? 0x4ADE80 : 0xF87171;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'Satelink Nodes',
                embeds: [{
                    title: `${emoji} Node Tier ${isUpgrade ? 'Upgrade' : 'Change'}`,
                    color,
                    fields: [
                        { name: 'Node', value: nodeId, inline: true },
                        { name: 'Change', value: `${oldTier.toUpperCase()} → ${newTier.toUpperCase()}`, inline: true },
                        { name: 'Score', value: String(score), inline: true }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (err) {
        console.error('[Epoch] Discord notification failed:', err.message);
    }
}
