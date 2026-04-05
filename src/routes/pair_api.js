import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyJWT } from './auth_v2.js';

export function createPairApiRouter(opsEngine) {
    const router = Router();

    // Clean up expired codes periodically
    setInterval(async () => {
        try {
            const now = Date.now();
            await opsEngine.db.query("UPDATE pair_codes SET status = 'expired' WHERE status = 'pending' AND expires_at < ?", [now]);
        } catch (e) {
            console.error("[PAIR] Cleanup Error:", e.message);
        }
    }, 60 * 1000);

    /**
     * POST /pair/request
     * Called by the USER (authenticated) to get a pairing code.
     * Enforce: Max 5 pending per wallet.
     */
    router.post('/request', verifyJWT, async (req, res) => {
        try {
            const wallet = req.user?.wallet;
            if (!wallet) return res.status(401).json({ ok: false, error: "Unauthorized" });

            // Enforce max 5 pending pair codes
            const pendingCount = (await opsEngine.db.get("SELECT COUNT(*) as c FROM pair_codes WHERE wallet = ? AND status = 'pending' AND expires_at > ?", [wallet, Date.now()]))?.c || 0;

            if (pendingCount >= 5) {
                return res.status(429).json({ ok: false, error: "Too many active codes. Please pair existing ones." });
            }

            // Generate 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

            await opsEngine.db.query(
                "INSERT INTO pair_codes (code, wallet, status, created_at, expires_at) VALUES (?, ?, 'pending', ?, ?)",
                [code, wallet, Date.now(), expiresAt]
            );

            res.json({
                ok: true,
                pair_code: code,
                expires_in: 600
            });
        } catch (error) {
            console.error("[PAIR] Request Error:", error);
            res.status(500).json({ ok: false, error: "Internal Error" });
        }
    });

    /**
     * POST /pair/confirm
     * Called by the DEVICE (public) to link itself to a pending code.
     * Body: { code, device_id }
     */
    router.post('/confirm', async (req, res) => {
        try {
            const { code, device_id } = req.body;
            if (!code || !device_id) return res.status(400).json({ ok: false, error: "Missing code or device_id" });

            const activeCode = await opsEngine.db.get("SELECT * FROM pair_codes WHERE code = ? AND status = 'pending'", [code]);

            if (!activeCode) {
                return res.status(404).json({ ok: false, error: "Invalid or expired code" });
            }

            if (Date.now() > activeCode.expires_at) {
                // Should have been cleaned up or caught above, but double check
                return res.status(400).json({ ok: false, error: "Code expired" });
            }

            // Transactional update
            // 1. Mark code used, store device_id, set used_at
            // 2. Create/Update node record

            const now = Math.floor(Date.now() / 1000);

            await opsEngine.db.query(
                "UPDATE pair_codes SET status = 'used', device_id = ?, used_at = ? WHERE code = ?",
                [device_id, Date.now(), code]
            );

            // Create/Update node
            const userWallet = activeCode.wallet;
            const existingNode = await opsEngine.db.get("SELECT * FROM nodes WHERE node_id = ?", [device_id]);

            if (existingNode) {
                await opsEngine.db.query("UPDATE nodes SET wallet = ?, status = 'pending', last_seen = ? WHERE node_id = ?", [userWallet, now, device_id]);
            } else {
                await opsEngine.db.query(
                    "INSERT INTO nodes (node_id, wallet, device_type, status, created_at, last_seen) VALUES (?, ?, 'edge', 'pending', ?, ?)",
                    [device_id, userWallet, now, now]
                );
            }

            console.log(`[PAIR] Device ${device_id} paired to ${userWallet} via code ${code}`);

            res.json({
                ok: true,
                status: 'LINKED',
                owner_wallet: userWallet
            });

        } catch (error) {
            console.error("[PAIR] Confirm Error:", error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    /**
     * GET /pair/status/:code
     * Called by the DEVICE to check if it has been linked.
     */
    router.get('/status/:code', async (req, res) => {
        try {
            const { code } = req.params;
            const data = await opsEngine.db.get("SELECT * FROM pair_codes WHERE code = ?", [code]);

            if (!data) {
                return res.status(404).json({ ok: false, error: "Invalid or expired code" });
            }

            if (data.status === 'expired' || (data.status === 'pending' && Date.now() > data.expires_at)) {
                return res.status(404).json({ ok: false, error: "Expired code" });
            }

            res.json({
                ok: true,
                status: data.status === 'used' ? 'LINKED' : 'WAITING_FOR_USER',
                owner_wallet: data.wallet,
                device_id: data.device_id
            });

        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    return router;
}
