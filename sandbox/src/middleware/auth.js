import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { validateEnv } from "../config/validateEnv.js";
const config = validateEnv();

export const createAdminAuth = (opsEngine) => (req, res, next) => {
    // 1. Get Token
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        // Strict Mode: Allow query param token for convenience but NO api key
        token = req.query.token;
    }

    if (!token) {
        if (opsEngine && typeof opsEngine.recordAuthFailure === 'function') {
            opsEngine.recordAuthFailure(req.path, req.ip);
        }
        return res.status(401).json({ error: "Unauthorized: PWM/JWT Token required" });
    }

    // 2. Verify JWT & Role
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
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
            const ipHash = req.ipHash || crypto.createHash('sha256').update(req.ip + (process.env.IP_HASH_SALT || 'salt')).digest('hex');
            req.abuseFirewall.recordMetric({ key_type: 'ip_hash', key_value: ipHash, metric: 'auth_fail' });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

