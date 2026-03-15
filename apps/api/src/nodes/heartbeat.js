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
            db.prepare(
                "INSERT OR IGNORE INTO registered_nodes (wallet, is_flagged, last_nonce) VALUES (?, 0, -1)"
            ).run(nodeWallet);
        } catch (e) { }

        // Read node state
        let node;
        try {
            node = db.prepare("SELECT is_flagged, last_nonce FROM registered_nodes WHERE wallet = ?").get(nodeWallet);
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
                db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run(nodeWallet);
                return res.status(401).json({ error: "Bad signature" });
            }
        } catch (e) {
            db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run(nodeWallet);
            return res.status(401).json({ error: "Bad signature" });
        }

        // Nonce checks AFTER signature valid
        const lastNonce = Number(node.last_nonce);
        if (Number(nonce) <= lastNonce) {
            db.prepare("UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?").run(nodeWallet);
            return res.status(409).json({ error: "Replay or lower nonce" });
        }

        // On success: update last_nonce and persist node stats
        try {
            db.prepare("UPDATE registered_nodes SET last_nonce = ? WHERE wallet = ?").run(Number(nonce), nodeWallet);
        } catch (e) { }

        // Persist CPU/memory stats for health monitoring
        try {
            db.prepare(`
                INSERT INTO node_stats (wallet, cpu, memory, uptime, recorded_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(wallet) DO UPDATE SET
                    cpu = excluded.cpu,
                    memory = excluded.memory,
                    uptime = excluded.uptime,
                    recorded_at = excluded.recorded_at
            `).run(
                nodeWallet,
                stats.cpu || 0,
                stats.memory || 0,
                stats.uptime || 0,
                Date.now()
            );
        } catch (e) {
            // node_stats table may not exist yet — non-fatal
        }

        // Track last heartbeat timestamp for watchdog
        try {
            db.prepare(`
                UPDATE registered_nodes SET last_heartbeat_at = ?, active = 1 WHERE wallet = ?
            `).run(Date.now(), nodeWallet);
        } catch (e) {
            // Column may not exist yet — non-fatal
        }

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
            }
        } catch (e) {
            // Non-fatal — watchdog is best-effort
        }
    }, WATCHDOG_INTERVAL_MS);

    console.log('[HeartbeatWatchdog] Started — checking every 30s, threshold 120s');
    return timer;
}
