function getPool(dbOrPool) {
    if (dbOrPool?.connect && dbOrPool?.query) return dbOrPool;
    if (dbOrPool?.pool?.connect && dbOrPool?.pool?.query) return dbOrPool.pool;
    throw new Error('[EpochFinalizer] A PostgreSQL pool or PgDatabase instance is required');
}

async function finalizeClosedEpochEarningsInTransaction(client, epochId, nowSeconds) {
    const epochResult = await client.query(`
        SELECT id, total_revenue_usdt
        FROM epochs
        WHERE id = $1 AND status = 'CLOSED'
        FOR UPDATE
    `, [epochId]);

    const epoch = epochResult.rows[0];
    if (!epoch) {
        throw new Error(`Closed epoch ${epochId} not found`);
    }

    const totalRevenue = epoch.total_revenue_usdt || '0';

    const nodesResult = await client.query(`
        SELECT DISTINCT node_id
        FROM revenue_events_v2
        WHERE epoch_id = $1
          AND node_id IS NOT NULL
          AND node_id <> ''
        ORDER BY node_id ASC
    `, [epochId]);

    const nodeIds = nodesResult.rows.map((row) => row.node_id);

    const splitResult = await client.query(`
        WITH split AS (
            SELECT
                $1::integer AS epoch_id,
                $2::numeric AS total_revenue_usdt,
                ($2::numeric * 0.50) AS node_pool_usdt,
                ($2::numeric * 0.30) AS platform_share_usdt,
                ($2::numeric * 0.20) AS distributor_share_usdt,
                $3::integer AS node_count
        ),
        platform_insert AS (
            INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at)
            SELECT epoch_id, 'platform', 'PLATFORM_TREASURY', platform_share_usdt, 'UNPAID', $4
            FROM split
            WHERE platform_share_usdt > 0
            ON CONFLICT (epoch_id, role, wallet_or_node_id) DO NOTHING
            RETURNING 1
        ),
        distribution_insert AS (
            INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at)
            SELECT epoch_id, 'distribution_pool', 'DAO_POOL', distributor_share_usdt, 'UNPAID', $4
            FROM split
            WHERE distributor_share_usdt > 0
            ON CONFLICT (epoch_id, role, wallet_or_node_id) DO NOTHING
            RETURNING 1
        ),
        node_insert AS (
            INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at)
            SELECT split.epoch_id, 'node_operator', nodes.node_id, split.node_pool_usdt / split.node_count, 'UNPAID', $4
            FROM split
            CROSS JOIN UNNEST($5::text[]) AS nodes(node_id)
            WHERE split.node_count > 0
              AND split.node_pool_usdt > 0
            ON CONFLICT (epoch_id, role, wallet_or_node_id) DO NOTHING
            RETURNING 1
        )
        SELECT
            (SELECT COUNT(*)::integer FROM platform_insert) AS platform_rows_inserted,
            (SELECT COUNT(*)::integer FROM distribution_insert) AS distribution_rows_inserted,
            (SELECT COUNT(*)::integer FROM node_insert) AS node_rows_inserted,
            (SELECT total_revenue_usdt FROM split) AS total_revenue_usdt,
            (SELECT node_pool_usdt FROM split) AS node_pool_usdt,
            (SELECT platform_share_usdt FROM split) AS platform_share_usdt,
            (SELECT distributor_share_usdt FROM split) AS distributor_share_usdt
    `, [epochId, totalRevenue, nodeIds.length, nowSeconds, nodeIds]);

    const split = splitResult.rows[0];

    return {
        ok: true,
        epoch_id: epochId,
        total_revenue_usdt: Number(split.total_revenue_usdt),
        node_pool_usdt: Number(split.node_pool_usdt),
        platform_share_usdt: Number(split.platform_share_usdt),
        distributor_share_usdt: Number(split.distributor_share_usdt),
        node_count: nodeIds.length,
        inserted: {
            node_operator: Number(split.node_rows_inserted || 0),
            platform: Number(split.platform_rows_inserted || 0),
            distribution_pool: Number(split.distribution_rows_inserted || 0)
        }
    };
}

export async function finalizeClosedEpochEarnings(dbOrPool, epochId) {
    if (!Number.isInteger(Number(epochId))) {
        throw new Error('epochId must be an integer');
    }

    const pool = getPool(dbOrPool);
    const client = await pool.connect();
    const normalizedEpochId = Number(epochId);
    const nowSeconds = Math.floor(Date.now() / 1000);

    try {
        await client.query('BEGIN');
        const result = await finalizeClosedEpochEarningsInTransaction(client, normalizedEpochId, nowSeconds);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
}

export { finalizeClosedEpochEarningsInTransaction };
