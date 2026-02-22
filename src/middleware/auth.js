/**
 * auth.js — HARDENED (ESM)
 *
 * AUDIT FIX (HIGH): Previously had JWT_SECRET fallback 'dev_only_secret'
 * which creates a critical security hole if NODE_ENV is misconfigured.
 *
 * NEW BEHAVIOUR:
 *   - No fallback ever — hard-fail if JWT_SECRET not set
 *   - Validates secret minimum length (32 chars, recommends 64+)
 *   - All environments (dev/staging/prod) require explicit secret
 *   - requireJWT kept as alias for backward compatibility with existing routes
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import "dotenv/config";

// ─── Validate JWT Secret at module load time ──────────────────────────────────
(function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('\n[FATAL] JWT_SECRET environment variable is not set.');
    console.error('[FATAL] This is required in ALL environments (dev, staging, prod).');
    console.error('[FATAL] Generate a secure secret with:');
    console.error('[FATAL]   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('[FATAL] Then set it in your .env file.\n');
    process.exit(1);
  }

  if (secret.length < 64) {
    console.error(`\n[FATAL] JWT_SECRET is too short (${secret.length} chars). Minimum 64 chars required.\n`);
    process.exit(1);
  }
})();

const JWT_SECRET = process.env.JWT_SECRET; // validated above — always set

const JWT_REFRESH = (() => {
  const r = process.env.JWT_REFRESH_SECRET;
  if (!r) {
    console.error('[FATAL] JWT_REFRESH_SECRET not set. Required for refresh token security.');
    process.exit(1);
  }
  return r;
})();

const TOKEN_TTL = process.env.JWT_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || '7d';
const ISSUER = process.env.JWT_ISSUER || 'satelink-network';

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * Generate an access + refresh token pair
 * @param {{ userId: string, role: string, walletAddress?: string }} payload
 */
export function generateTokens(payload) {
  const { userId, role, walletAddress } = payload;
  if (!userId || !role) throw new Error('generateTokens: userId and role are required');

  const tokenId = crypto.randomUUID();

  const accessToken = jwt.sign(
    { userId, role, walletAddress, jti: tokenId, type: 'access' },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL, issuer: ISSUER, algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    { userId, role, jti: tokenId, type: 'refresh' },
    JWT_REFRESH,
    { expiresIn: REFRESH_TOKEN_TTL, issuer: ISSUER, algorithm: 'HS256' }
  );

  return { accessToken, refreshToken, expiresIn: TOKEN_TTL, tokenId };
}

// ─── Token Verification ───────────────────────────────────────────────────────

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH, { issuer: ISSUER, algorithms: ['HS256'] });
}

// ─── Express Middleware ───────────────────────────────────────────────────────

/**
 * authenticate — validates Bearer access token (hard block)
 * Preserves abuse firewall recording from original auth.js
 */
export function authenticate(req, res, next) {
  // ── DEV BYPASS: skip auth when DEV_BYPASS_AUTH=true (never in production) ──
  if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.ALLOW_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    req.user = { wallet: '0xdevadmin', role: 'admin_super', userId: 'dev-admin', type: 'access' };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Preserve opsEngine failure recording from original
    if (req.app && req.app.get('opsEngine')) {
      const opsEngine = req.app.get('opsEngine');
      if (typeof opsEngine.recordAuthFailure === 'function') {
        opsEngine.recordAuthFailure(req.path, req.ip);
      }
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header with Bearer token required',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token type' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    // Preserve abuse firewall recording from original
    if (req.abuseFirewall) {
      const ipHash = req.ipHash || crypto.createHash('sha256').update(req.ip + (process.env.IP_HASH_SALT || '')).digest('hex');
      req.abuseFirewall.recordMetric({ key_type: 'ip_hash', key_value: ipHash, metric: 'auth_fail' });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Access token has expired. Please refresh.',
        expiredAt: err.expiredAt,
      });
    }
    return res.status(401).json({ error: 'InvalidToken', message: 'Token verification failed' });
  }
}

/** Backward-compat alias — existing routes use requireJWT */
export const requireJWT = authenticate;

/**
 * requireRole — role guard middleware factory
 * @param {string|string[]} allowedRoles
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    // DEV BYPASS: admin_super passes all role checks
    if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.ALLOW_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production') return next();
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Forbidden: No role assigned' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of roles: ${roles.join(', ')}`,
        yourRole: req.user.role,
      });
    }
    next();
  };
}

/**
 * optionalAuth — attaches user if token present, does not block
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try { req.user = verifyAccessToken(authHeader.slice(7)); }
    catch (_) { req.user = null; }
  }
  next();
}

/**
 * handleRefresh — wire to POST /auth/refresh route
 */
export async function handleRefresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    // TODO: check decoded.jti against revocation store (Redis)
    const tokens = generateTokens({ userId: decoded.userId, role: decoded.role, walletAddress: decoded.walletAddress });
    return res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: TOKEN_TTL });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'RefreshTokenExpired', message: 'Please log in again' });
    }
    return res.status(401).json({ error: 'InvalidRefreshToken' });
  }
}

// Expose for testing
export const _JWT_SECRET_LENGTH = JWT_SECRET.length;
