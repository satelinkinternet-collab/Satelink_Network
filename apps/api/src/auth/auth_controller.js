/**
 * Auth Controller — Express route handlers for the unified auth pipeline.
 *
 * Endpoints:
 *   POST /auth/challenge  — Request nonce for wallet signing
 *   POST /auth/verify     — Verify signature, issue JWT
 *   GET  /auth/me         — Return current user info
 *   POST /auth/refresh    — Rotate access token
 *   POST /auth/logout     — Clear session
 *
 * Backward-compatible aliases:
 *   POST /auth/nonce      → /auth/challenge
 *   POST /auth/start      → /auth/challenge
 *   POST /auth/finish     → /auth/verify
 */

import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import crypto from 'crypto';

import { generateNonce, verifySignature } from './wallet_auth.js';
import { createSession, getSessionCookieOptions, getRefreshCookieOptions } from './session_manager.js';
import { verifyAccessToken, verifyRefreshToken, generateTokenPair } from './jwt_service.js';
import { getPermissions } from './role_service.js';

/**
 * Create the unified auth router.
 * @param {object} db - Database instance
 * @returns {Router}
 */
export function createAuthController(db) {
    const router = Router();

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    const challengeLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        keyGenerator: (req) => ipKeyGenerator(req),
        message: { ok: false, error: 'Too many requests. Please try again later.' },
    });

    // ── POST /auth/challenge ──────────────────────────────────────────────────
    router.post('/challenge', challengeLimiter, async (req, res) => {
        try {
            const { address, wallet } = req.body;
            const addr = address || wallet;

            if (!addr) {
                return res.status(400).json({ ok: false, error: 'Wallet address required' });
            }

            const result = await generateNonce(db, addr);
            return res.json({ ok: true, ...result });
        } catch (e) {
            return res.status(400).json({ ok: false, error: e.message });
        }
    });

    // ── POST /auth/verify ─────────────────────────────────────────────────────
    router.post('/verify', async (req, res) => {
        try {
            const { address, wallet, signature, message } = req.body;
            const addr = address || wallet;

            if (!addr || !signature) {
                return res.status(400).json({ ok: false, error: 'Address and signature required' });
            }

            // Build message if not provided (reconstruct from nonce)
            let signedMessage = message;
            if (!signedMessage) {
                // Attempt to retrieve nonce to reconstruct message
                const row = await db.get(
                    "SELECT nonce FROM auth_nonces WHERE address = ?",
                    [addr.toLowerCase()]
                );
                if (row) {
                    signedMessage = `Welcome to Satelink!\n\nAuthorize your device by signing this nonce: ${row.nonce}\n\nAddress: ${addr.toLowerCase()}\nTimestamp: ${Date.now()}`;
                }
            }

            if (!signedMessage) {
                return res.status(400).json({ ok: false, error: 'Invalid or expired nonce' });
            }

            // Verify signature
            const verification = await verifySignature(db, addr, signature, signedMessage);

            // Create session
            const session = await createSession(db, verification.address, {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });

            // Set cookies
            res.cookie('satelink_session', session.tokens.accessToken, getSessionCookieOptions());

            return res.json({
                ok: true,
                token:        session.tokens.accessToken,
                refreshToken: session.tokens.refreshToken,
                expiresIn:    session.tokens.expiresIn,
                user:         session.user,
                dashboardRoute: session.dashboardRoute,
            });
        } catch (e) {
            return res.status(401).json({ ok: false, error: e.message });
        }
    });

    // ── GET /auth/me ──────────────────────────────────────────────────────────
    router.get('/me', (req, res) => {
        // Extract token from header or cookie
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (req.cookies && req.cookies.satelink_session) {
            token = req.cookies.satelink_session;
        }

        if (!token) {
            return res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Unauthorized' });
        }

        try {
            const decoded = verifyAccessToken(token);
            return res.json({
                ok: true,
                user: {
                    wallet:      decoded.wallet || decoded.userId,
                    role:        decoded.role,
                    permissions: decoded.permissions || getPermissions(decoded.role),
                    sessionId:   decoded.sessionId,
                    iat:         decoded.iat,
                    exp:         decoded.exp,
                },
            });
        } catch (e) {
            return res.status(401).json({ ok: false, code: 'UNAUTHENTICATED', error: 'Invalid or expired token' });
        }
    });

    // ── POST /auth/refresh ────────────────────────────────────────────────────
    router.post('/refresh', async (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ ok: false, error: 'refreshToken required' });
        }

        try {
            const decoded = verifyRefreshToken(refreshToken);
            if (decoded.type !== 'refresh') {
                return res.status(401).json({ ok: false, error: 'Invalid token type' });
            }

            // TODO: Check JTI against revocation store when Redis is available

            const tokens = generateTokenPair({
                userId: decoded.userId,
                role:   decoded.role,
                wallet: decoded.wallet,
            });

            res.cookie('satelink_session', tokens.accessToken, getSessionCookieOptions());

            return res.json({
                ok: true,
                accessToken:  tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn:    tokens.expiresIn,
            });
        } catch (e) {
            if (e.name === 'TokenExpiredError') {
                return res.status(401).json({ ok: false, error: 'Refresh token expired. Please log in again.' });
            }
            return res.status(401).json({ ok: false, error: 'Invalid refresh token' });
        }
    });

    // ── POST /auth/logout ─────────────────────────────────────────────────────
    router.post('/logout', (req, res) => {
        res.clearCookie('satelink_session');
        return res.json({ ok: true, message: 'Logged out' });
    });

    // ── Backward-compatible aliases ───────────────────────────────────────────
    // Frontend may call /auth/nonce or /auth/start instead of /auth/challenge
    router.post('/nonce', challengeLimiter, (req, res, next) => {
        req.url = '/challenge';
        router.handle(req, res, next);
    });
    router.post('/start', challengeLimiter, (req, res, next) => {
        req.url = '/challenge';
        router.handle(req, res, next);
    });
    router.post('/finish', (req, res, next) => {
        req.url = '/verify';
        router.handle(req, res, next);
    });

    return router;
}
