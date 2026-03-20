import { ethers } from "ethers";

export function attachHeartbeat(app, db) {
    app.post("/heartbeat", async (req, res) => {
        const { nodeWallet, timestamp, nonce, stats, signature } = req.body || {};

        if (!nodeWallet || timestamp === undefined || nonce === undefined || !stats || !signature) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // Timestamp freshness check — reject stale (>60s) or future-dated (>5s) heartbeats
        const MAX_AGE_MS = 60000;
        const MAX_FUTURE_MS = 5000;
        const age = Date.now() - Number(timestamp);
        if (age > MAX_AGE_MS) {
            return res.status(400).json({ error: "Stale heartbeat", age_ms: age });
        }
        if (age < -MAX_FUTURE_MS) {
            return res.status(400).json({ error: "Future-dated heartbeat", age_ms: age });
        }

        // Ensure row exists in registered_nodes
        try {
            await db.prepare(
                "INSERT INTO registered_nodes (wallet, is_flagged, last_nonce) VALUES (?, 0, -1) ON CONFLICT (wallet) DO NOTHING"
            ).run([nodeWallet]);
        } catch (e) { }

        // Read node state
        let node;
        try {
            node = await db.prepare("SELECT is_flagged, last_nonce FROM registered_nodes WHERE wallet = ?").get([nodeWallet]);
        } catch (e) { }

        if (!node) return res.status(500).json({ error: "Database error" });

        // If already flagged => 403
        if (Number(node.is_flagged) === 1) {
            return res.status(403).json({ error: "Node is flagged" });
        }

        // Verify signature
        try {
            const statsStr = JSON.stringify(stats);
            const message =
                "SATELINK_HEARTBEAT\n" +
                `wallet=${nodeWallet}\n` +
                `timestamp=${timestamp}\n` +
                `nonce=${nonce}\n` +
                `stats=${statsStr}`;

            const recovered = ethers.verifyMessage(message, signature);
            if (recovered.toLowerCase() !== nodeWallet.toLowerCase()) {
                await db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run([nodeWallet]);
                return res.status(401).json({ error: "Bad signature" });
            }
        } catch (e) {
            await db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run([nodeWallet]);
            return res.status(401).json({ error: "Bad signature" });
        }

        // Nonce checks AFTER signature valid
        const lastNonce = Number(node.last_nonce);
        if (Number(nonce) <= lastNonce) {
            await db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run([nodeWallet]);
            return res.status(409).json({ error: "Replay or lower nonce" });
        }

        // On success: update last_nonce, last_heartbeat, and active status
        const now = Math.floor(Date.now() / 1000);
        try {
            await db.prepare("UPDATE registered_nodes SET last_nonce = ? WHERE wallet = ?").run([Number(nonce), nodeWallet]);
        } catch (e) { }

        // Record uptime for epoch earnings distribution
        try {
            const epochRow = db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
            if (epochRow) {
                const epochId = epochRow.id;
                const prev = db.prepare("SELECT last_heartbeat FROM registered_nodes WHERE wallet = ?").get(nodeWallet);
                let uptimeDelta = 60; // default 60s per heartbeat
                if (prev && prev.last_heartbeat) {
                    const diff = now - prev.last_heartbeat;
                    if (diff > 0 && diff < 900) uptimeDelta = diff;
                }
                const existing = db.prepare("SELECT 1 FROM node_uptime WHERE node_wallet = ? AND epoch_id = ?").get(nodeWallet, epochId);
                if (existing) {
                    db.prepare("UPDATE node_uptime SET uptime_seconds = uptime_seconds + ?, score = score + ? WHERE node_wallet = ? AND epoch_id = ?")
                        .run(uptimeDelta, uptimeDelta, nodeWallet, epochId);
                } else {
                    db.prepare("INSERT INTO node_uptime (node_wallet, epoch_id, uptime_seconds, score) VALUES (?, ?, ?, ?)")
                        .run(nodeWallet, epochId, uptimeDelta, uptimeDelta);
                }
            }
        } catch (e) { console.error('[Heartbeat] Uptime tracking error:', e.message); }

        return res.status(200).json({ status: "ok" });
    });
}

/**
 * Heartbeat Watchdog — runs on interval, deactivates nodes that missed heartbeats.
 * Nodes with last_heartbeat_at older than STALE_THRESHOLD_MS are marked inactive.
 */
const STALE_THRESHOLD_MS = 120_000; // 2 minutes without heartbeat
const WATCHDOG_INTERVAL_MS = 30_000; // check every 30 seconds

export function startHeartbeatWatchdog(db) {
    // Ensure column exists
    try {
        db.prepare('ALTER TABLE registered_nodes ADD COLUMN last_heartbeat_at INTEGER').run();
    } catch (e) { /* column already exists */ }
    try {
        db.prepare('ALTER TABLE registered_nodes ADD COLUMN active INTEGER DEFAULT 1').run();
    } catch (e) { /* column already exists */ }

    const timer = setInterval(() => {
        try {
            const cutoff = Date.now() - STALE_THRESHOLD_MS;
            const result = db.prepare(`
                UPDATE registered_nodes
                SET active = 0
                WHERE active = 1
                  AND last_heartbeat_at IS NOT NULL
                  AND last_heartbeat_at < ?
                  AND is_flagged = 0
            `).run(cutoff);

            if (result.changes > 0) {
                console.log(`[HeartbeatWatchdog] Deactivated ${result.changes} stale node(s)`);
                // Reassign jobs from deactivated nodes
                reassignOrphanedJobs(db);
            }
        } catch (e) {
            // Non-fatal — watchdog is best-effort
        }
    }, WATCHDOG_INTERVAL_MS);

    console.log('[HeartbeatWatchdog] Started — checking every 30s, threshold 120s');
    return timer;
}

/**
 * Reassign jobs that were dispatched to nodes that are now inactive.
 * Moves them back to QUEUED status so the scheduler picks them up again.
 */
function reassignOrphanedJobs(db) {
    try {
        // Find jobs assigned to inactive nodes and reset them
        const result = db.prepare(`
            UPDATE job_queue_log
            SET status = 'QUEUED', route = 'REASSIGNED'
            WHERE status = 'DISPATCHED'
              AND route IN (
                  SELECT wallet FROM registered_nodes WHERE active = 0
              )
        `).run();

        if (result.changes > 0) {
            console.log(`[HeartbeatWatchdog] Reassigned ${result.changes} orphaned job(s) from inactive nodes`);
        }
    } catch (e) {
        // job_queue_log table may not have the expected columns — non-fatal
    }

    // Also reset active_jobs count for inactive nodes in capacity tracking
    try {
        db.prepare(`
            UPDATE node_capacity SET active_jobs = 0
            WHERE node_id IN (SELECT wallet FROM registered_nodes WHERE active = 0)
        `).run();
    } catch (e) { /* non-fatal */ }
}
