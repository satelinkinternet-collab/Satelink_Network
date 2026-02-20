import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev_only_secret') {
    throw new Error('FATAL: JWT_SECRET must be explicitly set in production mode.');
}

export const requireJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        // Record failure if engine exists
        if (req.app && req.app.get('opsEngine')) {
            const opsEngine = req.app.get('opsEngine');
            if (typeof opsEngine.recordAuthFailure === 'function') {
                opsEngine.recordAuthFailure(req.path, req.ip);
            }
        }
        return res.status(401).json({ error: "Unauthorized: Bearer Token required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        // [Phase 21] Record in Firewall
        if (req.abuseFirewall) {
            const ipHash = req.ipHash || crypto.createHash('sha256').update(req.ip + (process.env.IP_HASH_SALT || '')).digest('hex');
            req.abuseFirewall.recordMetric({ key_type: 'ip_hash', key_value: ipHash, metric: 'auth_fail' });
        }
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

export const requireRole = (allowedRoles) => (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(403).json({ error: "Forbidden: No role assigned" });
    }
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
};
