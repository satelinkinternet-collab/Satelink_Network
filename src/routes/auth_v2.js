import { Router } from 'express';
import jwt from 'jsonwebtoken';


export function verifyJWT(req, res, next) {
    // ── DEV BYPASS: skip auth when DEV_BYPASS_AUTH=true (never in production) ──
    if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.ALLOW_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
        req.user = { wallet: '0xdevadmin', role: 'admin_super', userId: 'dev-admin', type: 'access' };
        return next();
    }

    let authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.satelink_session) {
        token = req.cookies.satelink_session;
    }

    if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }
}

export function createUnifiedAuthRouter(opsEngine) {
    const router = Router();

    // GET /me - Returns current user info from JWT
    router.get('/me', verifyJWT, (req, res) => {
        res.json({
            ok: true,
            user: {
                wallet: req.user.wallet,
                role: req.user.role,
                iat: req.user.iat,
                exp: req.user.exp,
                iss: req.user.iss,
                permissions: getPermissionsForRole(req.user.role)
            }
        });
    });

    // Mock Login for other roles (DEV ONLY)
    if (process.env.NODE_ENV !== 'production') {
        router.post('/__test/auth/login', async (req, res) => {
            const { wallet, role } = req.body;
            if (!wallet || !role) return res.status(400).json({ error: 'Wallet and Role required' });

            const secret = process.env.JWT_SECRET;
            const token = jwt.sign(
                { wallet: wallet.toLowerCase(), role },
                secret,
                { expiresIn: '7d', issuer: 'satelink-core' }
            );

            res.json({ success: true, token });
        });
    }

    return router;
}

export function getPermissionsForRole(role) {
    const common = ['view_dashboard'];
    const permissions = {
        'admin_super': [...common, 'manage_system', 'manage_treasury', 'manage_ops'],
        'admin_ops': [...common, 'manage_ops'],
        'node_operator': [...common, 'view_node_stats', 'claim_rewards'],
        'builder': [...common, 'manage_keys', 'view_usage'],
        'distributor_lco': [...common, 'view_referrals', 'claim_commissions'],
        'distributor_influencer': [...common, 'view_referrals', 'claim_commissions'],
        'enterprise': [...common, 'view_usage', 'view_invoices']
    };
    return permissions[role] || common;
}
