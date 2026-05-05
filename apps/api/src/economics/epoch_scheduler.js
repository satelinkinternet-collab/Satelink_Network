import { finalizeClosedEpochEarningsInTransaction } from './epoch_finalizer.js';

const DEFAULT_INTERVAL_MS = 60_000;
const EPOCH_LOCK_ID = 738_291;

let isRunning = false;
let schedulerHandle = null;

export const schedulerStatus = {
    running: false,
    interval_ms: DEFAULT_INTERVAL_MS,
    last_run_time: null,
    last_status: null,
    last_error: null,
    last_closed_epoch_id: null,
    last_open_epoch_id: null,
    last_total_revenue_usdt: null,
    last_event_count: null
};

function getPool(dbOrPool) {
    if (dbOrPool?.connect && dbOrPool?.query) return dbOrPool;
    if (dbOrPool?.pool?.connect && dbOrPool?.pool?.query) return dbOrPool.pool;
    throw new Error('[EpochScheduler] A PostgreSQL pool or PgDatabase instance is required');
}

async function ensureOpenEpoch(client, nowSeconds) {
    const result = await client.query(`
        INSERT INTO epochs (starts_at, status, total_revenue_usdt, node_pool_usdt, platform_share_usdt, distributor_share_usdt)
        SELECT $1, 'OPEN', 0, 0, 0, 0
        WHERE NOT EXISTS (SELECT 1 FROM epochs WHERE status = 'OPEN')
        RETURNING id
    `, [nowSeconds]);

    return result.rows[0] || null;
}

export async function runEpochCycle(dbOrPool) {
    const pool = getPool(dbOrPool);
    const client = await pool.connect();
    const nowSeconds = Math.floor(Date.now() / 1000);

    try {
        await client.query('BEGIN');

        const lock = await client.query(
            'SELECT pg_try_advisory_xact_lock($1) AS locked',
            [EPOCH_LOCK_ID]
        );

        if (!lock.rows[0]?.locked) {
            await client.query('ROLLBACK');
            schedulerStatus.last_run_time = Date.now();
            schedulerStatus.last_status = 'skipped_lock_held';
            schedulerStatus.last_error = null;
            return { ok: true, status: 'skipped_lock_held' };
        }

        const epochResult = await client.query(`
            SELECT id
            FROM epochs
            WHERE status = 'OPEN'
            ORDER BY id ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        `);

        let epoch = epochResult.rows[0];
        if (!epoch) {
            epoch = await ensureOpenEpoch(client, nowSeconds);
            await client.query('COMMIT');

            schedulerStatus.last_run_time = Date.now();
            schedulerStatus.last_status = 'created_open_epoch';
            schedulerStatus.last_error = null;
            schedulerStatus.last_open_epoch_id = epoch?.id || null;
            return { ok: true, status: 'created_open_epoch', open_epoch_id: epoch?.id || null };
        }

        const aggregate = await client.query(`
            SELECT
                COUNT(*)::integer AS event_count,
                COALESCE(SUM(amount_usdt), 0)::numeric AS total_revenue_usdt
            FROM revenue_events_v2
            WHERE epoch_id = $1
        `, [epoch.id]);

        const eventCount = Number(aggregate.rows[0]?.event_count || 0);
        const totalRevenue = aggregate.rows[0]?.total_revenue_usdt || '0';

        const closed = await client.query(`
            UPDATE epochs
            SET
                status = 'CLOSED',
                ends_at = $2,
                total_revenue_usdt = totals.total_revenue_usdt,
                node_pool_usdt = totals.total_revenue_usdt * 0.50,
                platform_share_usdt = totals.total_revenue_usdt * 0.30,
                distributor_share_usdt = totals.total_revenue_usdt * 0.20
            FROM (
                SELECT COALESCE(SUM(amount_usdt), 0)::numeric AS total_revenue_usdt
                FROM revenue_events_v2
                WHERE epoch_id = $1
            ) AS totals
            WHERE epochs.id = $1
              AND epochs.status = 'OPEN'
            RETURNING
                epochs.id,
                epochs.total_revenue_usdt,
                epochs.node_pool_usdt,
                epochs.platform_share_usdt,
                epochs.distributor_share_usdt
        `, [epoch.id, nowSeconds]);

        if (closed.rowCount !== 1) {
            await client.query('ROLLBACK');
            schedulerStatus.last_run_time = Date.now();
            schedulerStatus.last_status = 'skipped_already_closed';
            schedulerStatus.last_error = null;
            return { ok: true, status: 'skipped_already_closed', epoch_id: epoch.id };
        }

        const earnings = await finalizeClosedEpochEarningsInTransaction(client, Number(epoch.id), nowSeconds);

        const nextOpen = await client.query(`
            INSERT INTO epochs (starts_at, status, total_revenue_usdt, node_pool_usdt, platform_share_usdt, distributor_share_usdt)
            VALUES ($1, 'OPEN', 0, 0, 0, 0)
            RETURNING id
        `, [nowSeconds]);

        await client.query('COMMIT');

        const closedEpoch = closed.rows[0];
        const openEpoch = nextOpen.rows[0];

        schedulerStatus.last_run_time = Date.now();
        schedulerStatus.last_status = 'success';
        schedulerStatus.last_error = null;
        schedulerStatus.last_closed_epoch_id = closedEpoch.id;
        schedulerStatus.last_open_epoch_id = openEpoch.id;
        schedulerStatus.last_total_revenue_usdt = Number(totalRevenue);
        schedulerStatus.last_event_count = eventCount;

        console.log(
            `[EpochScheduler] Closed epoch ${closedEpoch.id}: ${eventCount} events, ${totalRevenue} USDT; opened epoch ${openEpoch.id}`
        );

        return {
            ok: true,
            status: 'success',
            closed_epoch_id: closedEpoch.id,
            open_epoch_id: openEpoch.id,
            event_count: eventCount,
            total_revenue_usdt: Number(closedEpoch.total_revenue_usdt),
            node_pool_usdt: Number(closedEpoch.node_pool_usdt),
            platform_share_usdt: Number(closedEpoch.platform_share_usdt),
            distributor_share_usdt: Number(closedEpoch.distributor_share_usdt),
            earnings
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {}

        schedulerStatus.last_run_time = Date.now();
        schedulerStatus.last_status = 'error';
        schedulerStatus.last_error = error.message;
        console.error('[EpochScheduler] ERROR:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

export function startEpochScheduler(dbOrPool, options = {}) {
    if (global.__SATELINK_EPOCH_SCHEDULER_STARTED__) return schedulerHandle;

    const intervalMs = Number(options.intervalMs || process.env.EPOCH_INTERVAL_MS || DEFAULT_INTERVAL_MS);
    schedulerStatus.interval_ms = intervalMs;
    schedulerStatus.running = true;
    global.__SATELINK_EPOCH_SCHEDULER_STARTED__ = true;

    console.log(`[EpochScheduler] Started (interval: ${intervalMs}ms)`);

    schedulerHandle = setInterval(async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            await runEpochCycle(dbOrPool);
        } catch (error) {
            console.error('[EpochScheduler] Tick failed:', error.message);
        } finally {
            isRunning = false;
        }
    }, intervalMs);

    schedulerHandle.unref?.();
    return schedulerHandle;
}

export function stopEpochScheduler() {
    if (schedulerHandle) {
        clearInterval(schedulerHandle);
        schedulerHandle = null;
    }
    schedulerStatus.running = false;
    global.__SATELINK_EPOCH_SCHEDULER_STARTED__ = false;
}
