
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

    // Generic login handler
    const handleLogin = async (req, res) => {
        const { wallet, role, refCode } = req.body;
        if (!wallet) return res.status(400).json({ error: "Wallet required" });

        // Map role to specific claim
        let userRole = role || 'builder';

        // Ref Tracking (Phase 21)
        if (refCode && opsEngine && opsEngine.db) {
            try {
                const existing = await opsEngine.db.get("SELECT 1 FROM conversions WHERE wallet = ?", [wallet]);
                if (!existing) {
                    await opsEngine.db.query(
                        "INSERT INTO conversions (ref_code, wallet, role, created_at) VALUES (?, ?, ?, ?)",
                        [refCode, wallet, userRole, Date.now()]
                    );
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
    };

    router.post('/login', handleLogin);

    // Aliases for scripts/docs compatibility
    router.post('/admin/login', (req, res, next) => { req.body.role = 'admin_super'; handleLogin(req, res, next); });
    router.post('/node/login', (req, res, next) => { req.body.role = 'node_operator'; handleLogin(req, res, next); });
    router.post('/builder/login', (req, res, next) => { req.body.role = 'builder'; handleLogin(req, res, next); });

    return router;

    return router;
}
