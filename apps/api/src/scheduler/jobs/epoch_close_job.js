import { logger } from '../../monitoring/logger.js';

/**
 * Epoch Close Job
 * Runs daily at midnight UTC to close the current epoch,
 * calculate revenue splits (50/30/20), and create claims.
 */

const EPOCH_DURATION_HOURS = 24;
const SPLIT_NODE_OPERATORS = 0.50;
const SPLIT_PLATFORM = 0.30;
const SPLIT_DISTRIBUTION_POOL = 0.20;
const MIN_CLAIM_THRESHOLD_USDT = 1.0;

/**
 * Close the current open epoch and distribute earnings.
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 */
export async function closeCurrentEpoch(pool) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Find the open epoch
        const epochResult = await client.query(
            `SELECT id, epoch_number, started_at FROM epochs
             WHERE status = 'OPEN'
             ORDER BY epoch_number DESC LIMIT 1`
        );

        if (epochResult.rows.length === 0) {
            logger.info('EPOCH_CLOSE: No open epoch found, creating first epoch');
            await createNewEpoch(client);
            await client.query('COMMIT');
            return { created: true, closed: false };
        }

        const epoch = epochResult.rows[0];
        const epochId = epoch.id;
        const epochNumber = epoch.epoch_number;

        // 2. Calculate total revenue for this epoch
        const revenueResult = await client.query(
            `SELECT COALESCE(SUM(amount_usdt), 0) as total_revenue
             FROM revenue_events_v2
             WHERE created_at >= $1 AND epoch_id IS NULL`,
            [epoch.started_at]
        );

        const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue || 0);

        if (totalRevenue === 0) {
            logger.info({ epochNumber }, 'EPOCH_CLOSE: No revenue in epoch, closing empty');
        }

        // 3. Apply 50/30/20 split
        const nodeOperatorShare = totalRevenue * SPLIT_NODE_OPERATORS;
        const platformShare = totalRevenue * SPLIT_PLATFORM;
        const distributionPoolShare = totalRevenue * SPLIT_DISTRIBUTION_POOL;

        logger.info({
            epochNumber,
            totalRevenue,
            nodeOperatorShare,
            platformShare,
            distributionPoolShare
        }, 'EPOCH_CLOSE: applying 50/30/20 split');

        // 4. Get active nodes and their contribution weights
        const nodesResult = await client.query(
            `SELECT n.id, n.wallet_address, n.reputation_score,
                    COALESCE(c.request_count, 0) as request_count
             FROM nodes n
             LEFT JOIN (
                 SELECT node_id, COUNT(*) as request_count
                 FROM revenue_events_v2
                 WHERE created_at >= $1 AND node_id IS NOT NULL
                 GROUP BY node_id
             ) c ON n.id = c.node_id
             WHERE n.status = 'active'`,
            [epoch.started_at]
        );

        const activeNodes = nodesResult.rows;
        const totalWeight = activeNodes.reduce((sum, n) => {
            const repMultiplier = Math.max(0.5, (n.reputation_score || 500) / 1000);
            return sum + (n.request_count * repMultiplier);
        }, 0);

        // 5. Insert epoch_earnings for each node
        for (const node of activeNodes) {
            const repMultiplier = Math.max(0.5, (node.reputation_score || 500) / 1000);
            const nodeWeight = node.request_count * repMultiplier;
            const nodeEarnings = totalWeight > 0
                ? (nodeWeight / totalWeight) * nodeOperatorShare
                : 0;

            if (nodeEarnings > 0) {
                await client.query(
                    `INSERT INTO epoch_earnings (epoch_id, node_id, amount_usdt, created_at)
                     VALUES ($1, $2, $3, NOW())`,
                    [epochId, node.id, nodeEarnings]
                );

                // 6. Create claim if above threshold
                if (nodeEarnings >= MIN_CLAIM_THRESHOLD_USDT && node.wallet_address) {
                    await client.query(
                        `INSERT INTO claims (epoch_id, node_id, wallet, amount_usdt, status, created_at)
                         VALUES ($1, $2, $3, $4, 'PENDING', NOW())`,
                        [epochId, node.id, node.wallet_address, nodeEarnings]
                    );

                    logger.info({
                        epochNumber,
                        nodeId: node.id,
                        wallet: node.wallet_address,
                        amount: nodeEarnings
                    }, 'EPOCH_CLOSE: claim created');
                }
            }
        }

        // 7. Mark epoch as CLOSED
        await client.query(
            `UPDATE epochs SET status = 'CLOSED', closed_at = NOW(),
             total_revenue = $1, node_operator_share = $2,
             platform_share = $3, distribution_pool_share = $4
             WHERE id = $5`,
            [totalRevenue, nodeOperatorShare, platformShare, distributionPoolShare, epochId]
        );

        // 8. Update revenue_events_v2 with epoch_id
        await client.query(
            `UPDATE revenue_events_v2 SET epoch_id = $1
             WHERE created_at >= $2 AND epoch_id IS NULL`,
            [epochId, epoch.started_at]
        );

        // 9. Open new epoch
        await createNewEpoch(client);

        await client.query('COMMIT');

        logger.info({
            closedEpoch: epochNumber,
            totalRevenue,
            nodeOperatorShare,
            platformShare,
            nodesRewarded: activeNodes.filter(n => n.request_count > 0).length
        }, 'EPOCH_CLOSE: epoch closed successfully');

        return {
            closed: true,
            epochNumber,
            totalRevenue,
            nodeOperatorShare,
            platformShare,
            distributionPoolShare
        };

    } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ error: err.message }, 'EPOCH_CLOSE: failed to close epoch');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Create a new open epoch.
 */
async function createNewEpoch(client) {
    const result = await client.query(
        `INSERT INTO epochs (epoch_number, status, started_at)
         SELECT COALESCE(MAX(epoch_number), 0) + 1, 'OPEN', NOW()
         FROM epochs
         RETURNING epoch_number`
    );

    const newEpochNumber = result.rows[0].epoch_number;
    logger.info({ epochNumber: newEpochNumber }, 'EPOCH_CLOSE: new epoch opened');
    return newEpochNumber;
}

/**
 * Start the epoch close scheduler.
 * Runs at midnight UTC daily.
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 */
export function startEpochScheduler(pool) {
    const runClose = async () => {
        try {
            logger.info('EPOCH_SCHEDULER: running scheduled epoch close');
            await closeCurrentEpoch(pool);
        } catch (err) {
            logger.error({ error: err.message }, 'EPOCH_SCHEDULER: scheduled close failed');
        }
    };

    // Calculate ms until next midnight UTC
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
    ));
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    // Run at next midnight, then every 24 hours
    setTimeout(() => {
        runClose();
        setInterval(runClose, EPOCH_DURATION_HOURS * 60 * 60 * 1000);
    }, msUntilMidnight);

    logger.info({
        nextRunAt: nextMidnight.toISOString(),
        msUntilMidnight
    }, 'EPOCH_SCHEDULER: started, first run at midnight UTC');

    return {
        runNow: runClose,
        nextRunAt: nextMidnight
    };
}

export default { closeCurrentEpoch, startEpochScheduler };
