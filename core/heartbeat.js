import { ethers } from "ethers";

export function attachHeartbeat(app, db) {
    app.post("/heartbeat", async (req, res) => {
        const { nodeWallet, timestamp, nonce, stats, signature } = req.body || {};

        if (!nodeWallet || timestamp === undefined || nonce === undefined || !stats || !signature) {
            return res.status(400).json({ error: "Missing fields" });
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

        // On success: update last_nonce
        try {
            db.prepare("UPDATE registered_nodes SET last_nonce = ? WHERE wallet = ?").run(Number(nonce), nodeWallet);
        } catch (e) { }

        return res.status(200).json({ status: "ok" });
    });
}
