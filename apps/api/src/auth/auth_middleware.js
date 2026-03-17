/**
 * Unified Auth Middleware — Express middleware for the canonical auth pipeline.
 *
 * Exports:
 *   requireJWT       — Hard block: validates Bearer access token
 *   requireRole      — Role guard middleware factory
 *   optionalAuth     — Attaches user if token present, does not block
 *   requireBuilder   — Shorthand for requireRole('builder')
 *   requireAdmin     — Shorthand for requireRole(['admin_super', 'admin_ops'])
 *
 * Security invariants:
 *   - Tokens accepted ONLY from Authorization header or httpOnly cookie
 *   - No query-string token acceptance (leak via referrer, logs, history)
 *   - No dev bypass — all environments enforce auth
 *   - Abuse firewall integration preserved
 */

import crypto from 'crypto';
import { verifyAccessToken } from './jwt_service.js';
import { getPermissions } from './role_service.js';

/**
 * requireJWT — validates Bearer access token (hard block).
 * Accepts token from:
 *   1. Authorization: Bearer <token>
 *   2. httpOnly cookie: satelink_session
 *
 * On success: sets req.user with decoded JWT payload + permissions.
 * On failure: returns 401 with structured error.
 */
export function requireJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else {
        // Fallback: httpOnly cookie (set during /auth/verify)
        const cookieToken = req.cookies && req.cookies.satelink_session;
        if (cookieToken) {
            token = cookieToken;
        }
    }

    if (!token) {
        // Record auth failure for abuse firewall
        _recordAuthFailure(req);
        return res.status(401).json({
            ok: false,
            code: 'UNAUTHENTICATED',
            error: 'Authorization header with Bearer token required',
        });
    }

    try {
        const decoded = verifyAccessToken(token);

        if (decoded.type && decoded.type !== 'access') {
            return res.status(401).json({ ok: false, code: 'INVALID_TOKEN_TYPE', error: 'Invalid token type' });
        }

        // Attach user and permissions
        req.user = {
            ...decoded,
            permissions: decoded.permissions || getPermissions(decoded.role),
        };
        next();
    } catch (err) {
        // Record failure for abuse firewall
        _recordAbuseMetric(req);

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                ok: false,
                code: 'TOKEN_EXPIRED',
                error: 'Access token has expired. Please refresh.',
                expiredAt: err.expiredAt,
            });
        }
        return res.status(401).json({
            ok: false,
            code: 'INVALID_TOKEN',
            error: 'Token verification failed',
        });
    }
}

/**
 * requireRole — role guard middleware factory.
 * Must be used AFTER requireJWT.
 * @param {string|string[]} allowedRoles — single role or array of roles
 */
export function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                ok: false,
                code: 'NO_ROLE',
                error: 'Forbidden: No role assigned',
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                ok: false,
                code: 'INSUFFICIENT_ROLE',
                error: `Requires one of roles: ${roles.join(', ')}`,
                yourRole: req.user.role,
            });
        }
        next();
    };
}

/**
 * optionalAuth — attaches user if token present, does not block.
 * Useful for public endpoints that show extra data to authenticated users.
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (req.cookies && req.cookies.satelink_session) {
        token = req.cookies.satelink_session;
    }

    if (token) {
        try {
            req.user = verifyAccessToken(token);
        } catch (_) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
}

/**
 * Shorthand: requireAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])]
 */
export const requireAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])];

/**
 * Shorthand: requireBuilder = [requireJWT, requireRole('builder')]
 */
export const requireBuilder = [requireJWT, requireRole('builder')];

/**
 * Shorthand: requireNode = [requireJWT, requireRole('node_operator')]
 */
export const requireNode = [requireJWT, requireRole('node_operator')];

// ── Internal helpers ────────────────────────────────────────────────────────

function _recordAuthFailure(req) {
    if (req.app && req.app.get('opsEngine')) {
        const opsEngine = req.app.get('opsEngine');
        if (typeof opsEngine.recordAuthFailure === 'function') {
            opsEngine.recordAuthFailure(req.path, req.ip);
        }
    }
}

function _recordAbuseMetric(req) {
    if (req.abuseFirewall) {
        const ipHash = req.ipHash || crypto.createHash('sha256')
            .update(req.ip + process.env.IP_HASH_SALT)
            .digest('hex');
        req.abuseFirewall.recordMetric({
            key_type: 'ip_hash',
            key_value: ipHash,
            metric: 'auth_fail',
        });
    }
}
