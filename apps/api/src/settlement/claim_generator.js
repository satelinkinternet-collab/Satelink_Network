import crypto from 'crypto';

function getPool(dbOrPool) {
    if (dbOrPool?.connect && dbOrPool?.query) return dbOrPool;
    if (dbOrPool?.pool?.connect && dbOrPool?.pool?.query) return dbOrPool.pool;
    throw new Error('[ClaimGenerator] A PostgreSQL pool or PgDatabase instance is required');
}

function claimLeafHash(epochId, operatorWallet, amountUsdt) {
    return crypto
        .createHash('sha256')
        .update(`${epochId}:${operatorWallet}:${amountUsdt}`)
        .digest('hex');
}

export async function generateClaimsForUnpaidEarnings(dbOrPool, options = {}) {
    const pool = getPool(dbOrPool);
    const client = await pool.connect();
    const epochId = options.epochId === undefined ? null : Number(options.epochId);

    if (options.epochId !== undefined && !Number.isInteger(epochId)) {
        client.release();
        throw new Error('epochId must be an integer when provided');
    }

    try {
        await client.query('BEGIN');

        const unpaidResult = await client.query(`
            SELECT
                epoch_id,
                wallet_or_node_id AS operator_wallet,
                amount_usdt
            FROM epoch_earnings
            WHERE status = 'UNPAID'
              AND ($1::integer IS NULL OR epoch_id = $1)
            ORDER BY epoch_id ASC, wallet_or_node_id ASC
            FOR UPDATE
        `, [epochId]);

        const aggregated = new Map();
        for (const row of unpaidResult.rows) {
            const key = `${row.epoch_id}:${row.operator_wallet}`;
            const current = aggregated.get(key) || {
                epoch_id: Number(row.epoch_id),
                operator_wallet: row.operator_wallet,
                amount_usdt: 0
            };
            current.amount_usdt += Number(row.amount_usdt || 0);
            aggregated.set(key, current);
        }

        const candidates = [...aggregated.values()]
            .filter((row) => row.amount_usdt > 0)
            .map((row) => {
                const amountUsdt = row.amount_usdt.toFixed(8).replace(/\.?0+$/, '');
                return {
                    epoch_id: row.epoch_id,
                    operator_wallet: row.operator_wallet,
                    amount_usdt: amountUsdt,
                    leaf_hash: claimLeafHash(row.epoch_id, row.operator_wallet, amountUsdt)
                };
            });

        if (candidates.length === 0) {
            await client.query('COMMIT');
            return { ok: true, scanned: 0, claims_created: 0, earnings_updated: 0, claims: [] };
        }

        const insertResult = await client.query(`
            WITH input AS (
                SELECT *
                FROM jsonb_to_recordset($1::jsonb) AS x(
                    epoch_id integer,
                    operator_wallet text,
                    amount_usdt text,
                    leaf_hash text
                )
            )
            INSERT INTO epoch_claims (epoch_id, operator_wallet, amount_usdt, leaf_hash, proof)
            SELECT epoch_id, operator_wallet, amount_usdt, leaf_hash, NULL
            FROM input
            ON CONFLICT (epoch_id, operator_wallet) DO NOTHING
            RETURNING epoch_id, operator_wallet, amount_usdt
        `, [JSON.stringify(candidates)]);

        const updateResult = await client.query(`
            UPDATE epoch_earnings ee
            SET status = 'CLAIMED'
            WHERE ee.status = 'UNPAID'
              AND ($1::integer IS NULL OR ee.epoch_id = $1)
              AND EXISTS (
                  SELECT 1
                  FROM epoch_claims ec
                  WHERE ec.epoch_id = ee.epoch_id
                    AND ec.operator_wallet = ee.wallet_or_node_id
              )
        `, [epochId]);

        await client.query('COMMIT');

        return {
            ok: true,
            scanned: candidates.length,
            claims_created: insertResult.rowCount,
            earnings_updated: updateResult.rowCount,
            claims: insertResult.rows.map((row) => ({
                epoch_id: Number(row.epoch_id),
                operator_wallet: row.operator_wallet,
                amount_usdt: row.amount_usdt
            }))
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
}

export { claimLeafHash };
