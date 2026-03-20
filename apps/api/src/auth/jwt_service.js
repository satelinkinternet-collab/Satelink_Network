/**
 * JWT Service — Single source of truth for token operations.
 *
 * Security invariants:
 *   - No fallback secrets — process exits if env vars missing
 *   - Separate secrets for access and refresh tokens
 *   - All tokens include JTI for revocation support
 *   - Algorithm locked to HS256
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validateEnv } from '../utils/validateEnv.js';

// Hard-fail at module load if secrets are missing
validateEnv();

const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const TOKEN_TTL           = process.env.JWT_TTL || '15m';
const REFRESH_TOKEN_TTL   = process.env.JWT_REFRESH_TTL || '7d';
const ISSUER              = process.env.JWT_ISSUER || 'satelink-network';
const ALGORITHM           = 'HS256';

/**
 * Sign an access token.
 * @param {object} payload - Must include userId, role. May include wallet, permissions, sessionId.
 * @returns {{ accessToken: string, tokenId: string, expiresIn: string }}
 */
export function signAccessToken(payload) {
    const { userId, role, wallet, permissions, sessionId } = payload;
    if (!userId || !role) throw new Error('signAccessToken: userId and role required');

    const jti = crypto.randomUUID();

    const accessToken = jwt.sign(
        { userId, role, wallet, permissions, sessionId, jti, type: 'access' },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL, issuer: ISSUER, algorithm: ALGORITHM }
    );

    return { accessToken, tokenId: jti, expiresIn: TOKEN_TTL };
}

/**
 * Sign a refresh token.
 */
export function signRefreshToken(payload) {
    const { userId, role, wallet } = payload;
    if (!userId || !role) throw new Error('signRefreshToken: userId and role required');

    const jti = crypto.randomUUID();

    const refreshToken = jwt.sign(
        { userId, role, wallet, jti, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_TTL, issuer: ISSUER, algorithm: ALGORITHM }
    );

    return { refreshToken, tokenId: jti };
}

/**
 * Generate both access + refresh tokens.
 */
export function generateTokenPair(payload) {
    const access  = signAccessToken(payload);
    const refresh = signRefreshToken(payload);

    return {
        accessToken:  access.accessToken,
        refreshToken: refresh.refreshToken,
        tokenId:      access.tokenId,
        expiresIn:    access.expiresIn,
    };
}

/**
 * Verify an access token. Throws on failure.
 */
export function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET, { issuer: ISSUER, algorithms: [ALGORITHM] });
}

/**
 * Verify a refresh token. Throws on failure.
 */
export function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET, { issuer: ISSUER, algorithms: [ALGORITHM] });
}

/**
 * Decode without verification (for logging/debugging only).
 */
export function decodeToken(token) {
    return jwt.decode(token);
}
