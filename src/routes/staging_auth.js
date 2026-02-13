import { Router } from 'express';
import { signJWT } from './auth_v2.js';

export function createStagingAuthRouter(opsEngine) {
    const router = Router();

    // Middleware to check Basic Auth
    const requireBasicAuth = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({ ok: false, error: "Missing Basic Auth" });
        }

        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        if (username !== process.env.STAGING_BASIC_USER || password !== process.env.STAGING_BASIC_PASS) {
            return res.status(401).json({ ok: false, error: "Invalid Credentials" });
        }
        next();
    };

    /**
     * POST /staging/login
     * Secure login for staging environment.
     * Headers: Authorization: Basic <base64(user:pass)>
     * Body: { wallet, role }
     */
    router.post('/login', requireBasicAuth, async (req, res) => {
        try {
            // Double check environment safety
            if (process.env.NODE_ENV !== 'production' || process.env.STAGING_MODE !== 'true') {
                return res.status(404).json({ ok: false, error: "Not Found" });
            }

            const { wallet, role } = req.body;
            if (!wallet) return res.status(400).json({ ok: false, error: "Missing wallet" });

            // Allow any role for testing flexibility in staging
            const token = signJWT({ wallet, role: role || 'user' });

            // Ensure user exists in DB
            await opsEngine.db.query(
                `INSERT INTO user_roles (wallet, role, created_at) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(wallet) DO UPDATE SET role = ?, last_seen = ?`,
                [wallet, role || 'user', Date.now(), role || 'user', Date.now()]
            );

            res.json({ ok: true, token });
        } catch (error) {
            console.error("[STAGING_AUTH] Login Error:", error);
            res.status(500).json({ ok: false, error: "Internal Error" });
        }
    });

    return router;
}
