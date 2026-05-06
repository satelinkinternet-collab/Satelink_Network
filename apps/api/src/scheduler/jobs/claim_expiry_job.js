import { logger } from '../../monitoring/logger.js';

/**
 * Claim Expiry Job
 * Runs every 6 hours to:
 * 1. Expire unclaimed earnings after 48 days → sweep to treasury
 * 2. Expire unsubmitted claim signatures after 48 hours
 */

const EARNINGS_EXPIRY_DAYS = 48;
const SIGNATURE_EXPIRY_HOURS = 48;
const JOB_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Sweep expired unclaimed earnings to treasury.
 * @param {import('pg').Pool} pool - PostgreSQL pool
 */
async function sweepExpiredEarnings(pool) {
    const client = await pool.connect();
    const now = Math.floor(Date.now() / 1000);
    const expiryThreshold = now - (EARNINGS_EXPIRY_DAYS * 24 * 60 * 60); // 48 days ago

    try {
        await client.query('BEGIN');

        // Find expired unclaimed earnings grouped by node
        const expiredResult = await client.query(`
            SELECT
                wallet_or_node_id as node_id,
                SUM(amount_usdt) as expired_amount
            FROM epoch_earnings
            WHERE status = 'UNPAID'
            AND created_at < $1
            GROUP BY wallet_or_node_id
            HAVING SUM(amount_usdt) > 0
        `, [expiryThreshold]);

        let totalSwept = 0;

        for (const row of expiredResult.rows) {
            // Mark earnings as expired
            await client.query(`
                UPDATE epoch_earnings
                SET status = 'EXPIRED', expired_at = $1
                WHERE wallet_or_node_id = $2
                AND status = 'UNPAID'
                AND created_at < $3
            `, [now, row.node_id, expiryThreshold]);

            // Record sweep to treasury
            await client.query(`
                INSERT INTO treasury_sweeps (node_id, amount_usdt, reason, swept_at)
                VALUES ($1, $2, '48_day_expiry', $3)
            `, [row.node_id, row.expired_amount, now]);

            totalSwept += parseFloat(row.expired_amount);

            logger.info({
                nodeId: row.node_id,
                amount: row.expired_amount,
                reason: '48_day_expiry'
            }, 'CLAIM_EXPIRY: swept unclaimed earnings to treasury');
        }

        await client.query('COMMIT');

        return {
            nodesAffected: expiredResult.rows.length,
            totalSwept
        };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Expire unsubmitted claim signatures after 48 hours.
 * @param {import('pg').Pool} pool - PostgreSQL pool
 */
async function expireStaleSignatures(pool) {
    const now = Math.floor(Date.now() / 1000);

    const result = await pool.query(`
        UPDATE claims
        SET status = 'expired'
        WHERE status = 'pending'
        AND expiry < $1
        RETURNING claim_id, node_id, amount_usdt
    `, [now]);

    if (result.rows.length > 0) {
        logger.info({
            count: result.rows.length,
            claims: result.rows.map(r => r.claim_id)
        }, 'CLAIM_EXPIRY: expired stale claim signatures');
    }

    return { expiredSignatures: result.rows.length };
}

/**
 * Run the full expiry job.
 * @param {import('pg').Pool} pool - PostgreSQL pool
 */
async function runExpiryJob(pool) {
    try {
        logger.info('CLAIM_EXPIRY: running scheduled expiry job');

        // 1. Sweep 48-day expired earnings
        const earningsResult = await sweepExpiredEarnings(pool);

        // 2. Expire 48-hour stale signatures
        const signaturesResult = await expireStaleSignatures(pool);

        logger.info({
            nodesSwept: earningsResult.nodesAffected,
            totalSwept: earningsResult.totalSwept,
            signaturesExpired: signaturesResult.expiredSignatures
        }, 'CLAIM_EXPIRY: job completed');

        return {
            ok: true,
            ...earningsResult,
            ...signaturesResult
        };

    } catch (err) {
        logger.error({ error: err.message }, 'CLAIM_EXPIRY: job failed');
        throw err;
    }
}

/**
 * Start the claim expiry scheduler.
 * Runs every 6 hours.
 * @param {import('pg').Pool} pool - PostgreSQL pool
 */
export function startClaimExpiryJob(pool) {
    const run = async () => {
        try {
            await runExpiryJob(pool);
        } catch (err) {
            logger.error({ error: err.message }, 'CLAIM_EXPIRY: scheduled run failed');
        }
    };

    // Run immediately on startup, then every 6 hours
    run();
    const intervalId = setInterval(run, JOB_INTERVAL_MS);

    logger.info({
        intervalHours: JOB_INTERVAL_MS / (60 * 60 * 1000),
        earningsExpiryDays: EARNINGS_EXPIRY_DAYS,
        signatureExpiryHours: SIGNATURE_EXPIRY_HOURS
    }, 'CLAIM_EXPIRY: started — sweeping unclaimed rewards every 6h');

    return {
        runNow: run,
        stop: () => clearInterval(intervalId)
    };
}

/**
 * Ensure required tables exist.
 * @param {import('pg').Pool} pool - PostgreSQL pool
 */
export async function ensureExpiryTables(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS treasury_sweeps (
            id SERIAL PRIMARY KEY,
            node_id TEXT,
            amount_usdt NUMERIC(18,8),
            reason TEXT,
            swept_at BIGINT
        )
    `);

    // Ensure claims table has required columns
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'claims' AND column_name = 'claim_id') THEN
                ALTER TABLE claims ADD COLUMN claim_id TEXT UNIQUE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'claims' AND column_name = 'signature') THEN
                ALTER TABLE claims ADD COLUMN signature TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'claims' AND column_name = 'nonce') THEN
                ALTER TABLE claims ADD COLUMN nonce BIGINT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'claims' AND column_name = 'expiry') THEN
                ALTER TABLE claims ADD COLUMN expiry BIGINT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'epoch_earnings' AND column_name = 'expired_at') THEN
                ALTER TABLE epoch_earnings ADD COLUMN expired_at BIGINT;
            END IF;
        END $$;
    `);

    logger.info('CLAIM_EXPIRY: ensured required tables exist');
}

export default {
    startClaimExpiryJob,
    runExpiryJob,
    ensureExpiryTables
};
