import { JobQueue } from '../queue/job_queue.js';
import { JobProducer } from '../queue/job_producer.js';

const INTERVAL_MS = parseInt(process.env.EPOCH_INTERVAL_MS || '60000', 10);
const LOCK_ID = 738291; // Arbitrary unique lock ID for epoch aggregation

let running = false;

// Exported status tracker — read by /system/status
export const schedulerStatus = {
    last_run_time: null,
    last_status: null,
    last_error: null
};

/**
 * Attempt to acquire a distributed lock via PostgreSQL advisory locks.
 */
async function tryAcquireLock(db) {
    // Access the pool directly from PgDatabase to run raw SQL
    const pool = db.pool;
    if (!pool) return true; // SQLite fallback
    try {
        const result = await pool.query(`SELECT pg_try_advisory_lock(${LOCK_ID}) as locked`);
        return result.rows?.[0]?.locked || false;
    } catch (e) {
        // Pool might not support advisory locks (e.g. if it's not actually a PG pool in some test envs)
        return true;
    }
}

/**
 * Release the distributed lock.
 */
async function releaseLock(db) {
    const pool = db.pool;
    if (!pool) return;
    try {
        await pool.query(`SELECT pg_advisory_unlock(${LOCK_ID})`);
    } catch (e) {}
}

async function runEpochCycle(db) {
    try {
        console.log("[AUTO-EPOCH] Processing epoch cycle...");
        
        // Phase 3: Real Execution Check (Synthetic Disabled for Phase 9)
        const queueLength = await JobQueue.getLength();
        console.log(`[AUTO-EPOCH] Queue length: ${queueLength}`);

        console.log("[AUTO-EPOCH] Checking epoch");
        const now = Math.floor(Date.now() / 1000);

        // 1. Find OPEN epoch
        let epoch = await db.prepare("SELECT id FROM epochs WHERE status = 'OPEN'").get([]);
        if (!epoch) {
            const r = await db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run([now]);
            epoch = { id: r.lastInsertRowid };
        }
        const epochId = epoch.id;

        // 2. Check revenue
        const rev = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE epoch_id = ?").get([epochId]);

        if (rev.count === 0) {
            console.log("[AUTO-EPOCH] No revenue, skipping aggregation");
            schedulerStatus.last_run_time = Date.now();
            schedulerStatus.last_status = "skipped";
            schedulerStatus.last_error = null;
            return;
        }

        // 3. Idempotency: skip if already has earnings
        const existing = await db.prepare("SELECT COUNT(*) as count FROM epoch_earnings WHERE epoch_id = ?").get([epochId]);
        if (existing.count > 0) {
            console.log("[AUTO-EPOCH] Epoch", epochId, "already finalized, skipping");
            schedulerStatus.last_run_time = Date.now();
            schedulerStatus.last_status = "skipped";
            schedulerStatus.last_error = null;
            return;
        }

        console.log("[AUTO-EPOCH] Closing epoch", epochId, "| revenue:", rev.count, "events,", rev.total, "USDT");

        // 4. 50/30/20 split
        const totalRevenue = rev.total;
        const nodePool = totalRevenue * 0.50;
        const platformFee = totalRevenue * 0.30;
        const distroPool = totalRevenue * 0.20;

        // 5. Node contributions
        const nodeContributions = await db.prepare(`
            SELECT node_id, COUNT(*) as ops, COALESCE(SUM(amount_usdt), 0) as revenue
            FROM revenue_events_v2
            WHERE epoch_id = ? AND node_id IS NOT NULL
            GROUP BY node_id
        `).all([epochId]);

        const totalNodeRevenue = nodeContributions.reduce((s, n) => s + n.revenue, 0);

        // 6. Atomic aggregation
        await db.transaction(async () => {
            await db.prepare("INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'platform', 'PLATFORM_TREASURY', ?, 'UNPAID', ?)").run([epochId, platformFee, now]);
            await db.prepare("INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'distribution_pool', 'DIST_POOL', ?, 'UNPAID', ?)").run([epochId, distroPool, now]);

            for (const node of nodeContributions) {
                const share = totalNodeRevenue > 0
                    ? (node.revenue / totalNodeRevenue) * nodePool
                    : 0;
                if (share > 0) {
                    await db.prepare("INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'node_operator', ?, ?, 'UNPAID', ?)").run([epochId, node.node_id, share, now]);
                }
            }

            await db.prepare("UPDATE epochs SET status = 'FINALIZED', ends_at = ?, total_revenue_usdt = ?, node_pool_usdt = ?, platform_share_usdt = ?, distributor_share_usdt = ? WHERE id = ?").run([now, totalRevenue, nodePool, platformFee, distroPool, epochId]);
        });
        
        console.log('[REVENUE_TRACE] revenue_recorded');

        // 7. Update balances
        const earningsRows = await db.prepare("SELECT wallet_or_node_id, SUM(amount_usdt) as total FROM epoch_earnings WHERE epoch_id = ? AND role = 'node_operator' GROUP BY wallet_or_node_id").all([epochId]);
        for (const row of earningsRows) {
            const exists = await db.prepare("SELECT 1 FROM balances WHERE wallet = ?").get([row.wallet_or_node_id]);
            if (exists) {
                await db.prepare("UPDATE balances SET amount_usdt = amount_usdt + ?, updated_at = ? WHERE wallet = ?").run([row.total, now, row.wallet_or_node_id]);
            } else {
                await db.prepare("INSERT INTO balances (wallet, amount_usdt, updated_at) VALUES (?, ?, ?)").run([row.wallet_or_node_id, row.total, now]);
            }
        }

        // 8. Open new epoch
        await db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run([now]);

        console.log('[REVENUE_TRACE] epoch_updated');
        console.log("[AUTO-EPOCH] SUCCESS | Epoch", epochId, "closed | earnings:", earningsRows.length, "nodes | revenue:", totalRevenue, "USDT");
        
        schedulerStatus.last_run_time = Date.now();
        schedulerStatus.last_status = "success";
        schedulerStatus.last_error = null;

    } catch (e) {
        console.error("[AUTO-EPOCH] ERROR:", e.message);
        schedulerStatus.last_run_time = Date.now();
        schedulerStatus.last_status = "error";
        schedulerStatus.last_error = e.message;
    }
}

let isRunning = false;

export function startEpochScheduler(db) {
    if (global.__EPOCH_SCHEDULER_STARTED__) return;
    global.__EPOCH_SCHEDULER_STARTED__ = true;

    console.log(`[AUTO-EPOCH] Scheduler started (interval: 60000ms)`);

    const handle = setInterval(async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            console.log('[AUTO-EPOCH] Tick');
            
            const lockAcquired = await tryAcquireLock(db);
            if (!lockAcquired) {
                isRunning = false;
                return;
            }

            try {
                await runEpochCycle(db);
            } finally {
                await releaseLock(db);
            }
        } catch (err) {
            console.error('[AUTO-EPOCH ERROR]', err.message);
        } finally {
            isRunning = false;
        }
    }, 60000);

    handle.unref();
    return handle;
}
