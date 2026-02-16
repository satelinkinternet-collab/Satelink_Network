import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Step 1 enforced process.env.JWT_SECRET presence in prod
const JWT_SECRET = process.env.JWT_SECRET;

export const requireJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Bearer Token required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
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

