
import { Router } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret';

export function createDevAuthRouter(opsEngine) {
    const router = Router();

    // Guard: strictly dev only
    router.use((req, res, next) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).send('Not Found');
        }
        next();
    });

    // Generic login for frontend convenience + ref tracking
    router.post('/login', async (req, res) => {
        const { wallet, role, refCode } = req.body;
        if (!wallet) return res.status(400).json({ error: "Wallet required" });

        // Map role to specific claim
        let userRole = role || 'builder';

        // Ref Tracking (Phase 21)
        if (refCode) {
            try {
                // OpsEngine might not be passed here? Need to pass it to createDevAuthRouter
                // If not passed, we skip conversion tracking or need to fix server.js
                // server.js calls createDevAuthRouter() without args.
                // Let's modify server.js first? Or just use raw DB if possible? 
                // We don't have DB access here easily unless we change signature.
                // I will update server.js to pass opsEngine to createDevAuthRouter.

                // Assuming opsEngine is passed now (I will do that next tool call)
                if (opsEngine && opsEngine.db) {
                    // Check existing
                    const existing = await opsEngine.db.get("SELECT 1 FROM conversions WHERE wallet = ?", [wallet]);
                    if (!existing) {
                        await opsEngine.db.query(
                            "INSERT INTO conversions (ref_code, wallet, role, created_at) VALUES (?, ?, ?, ?)",
                            [refCode, wallet, userRole, Date.now()]
                        );
                    }
                }
            } catch (e) {
                console.error("[DEV AUTH] Conversion Error:", e.message);
            }
        }

        const token = jwt.sign(
            { wallet: wallet.toLowerCase(), role: userRole },
            JWT_SECRET,
            { expiresIn: '7d', issuer: 'satelink-core' }
        );

        res.json({ success: true, token, role: userRole });
    });

    return router;

    return router;
}
