import jwt from 'jsonwebtoken';

export const createAdminAuth = (opsEngine) => (req, res, next) => {
    // 1. Get Token
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        // Fallback: Check for legacy static key (Migration/Dev only)
        const adminKey = process.env.ADMIN_API_KEY;
        if (adminKey && req.headers["x-admin-key"] === adminKey) {
            return next();
        }

        if (opsEngine && typeof opsEngine.recordAuthFailure === 'function') {
            opsEngine.recordAuthFailure(req.path, req.ip);
        }
        return res.status(401).json({ error: "Unauthorized: Token required" });
    }

    // 2. Verify JWT & Role
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_only_secret');
        if (!['admin_super', 'admin_ops'].includes(decoded.role)) {
            return res.status(403).json({ error: "Forbidden: Admin role required" });
        }
        req.user = decoded;
        next();
    } catch (e) {
        if (opsEngine && typeof opsEngine.recordAuthFailure === 'function') {
            opsEngine.recordAuthFailure(req.path, req.ip);
        }
        // [Phase 21] Record in Firewall
        if (req.abuseFirewall) {
            const ipHash = req.ipHash || crypto.createHash('sha256').update(req.ip + process.env.IP_HASH_SALT).digest('hex');
            req.abuseFirewall.recordMetric({ key_type: 'ip_hash', key_value: ipHash, metric: 'auth_fail' });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

// For backward compatibility or simpler use
export function adminAuth(req, res, next) {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(500).json({ error: "ADMIN_API_KEY not configured" });

    const providedKey = req.headers["x-admin-key"];
    if (!providedKey || providedKey !== adminKey) {
        return res.status(401).json({ error: "Unauthorized admin access" });
    }
    next();
}
