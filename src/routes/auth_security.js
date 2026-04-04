import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { verifyJWT } from './auth_v2.js';

const JWT_SECRET = process.env.JWT_SECRET;
const REAUTH_TTL = 300; // 5 minutes

// Helper to hash tokens
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAuthSecurityRouter(db) {
    const router = Router();

    // 1. Start Reauth (Get Nonce)
    router.post('/reauth/start', async (req, res) => {
        try {
            const { wallet, scope } = req.body;
            if (!wallet || !scope) return res.status(400).json({ ok: false, error: 'Missing wallet or scope' });
            const normalizedWallet = wallet.toLowerCase();

            // Generate nonce
            const nonce = crypto.randomBytes(16).toString('hex');
            const message = `Sign this message to confirm action: ${scope}\nNonce: ${nonce}\nDomain: ${req.get('host')}`;

            // Store nonce (reuse auth_nonces table or new one? auth_nonces is fine if we prefix)
            // But auth_nonces table might expect specific format.
            // Let's use auth_nonces table from Phase 37: (wallet, nonce, expires_at)
            // We'll store the full message as the "nonce" or just the random part?
            // auth_nonces schema: wallet, nonce, expires_at.
            // We can store just the nonce string.
            await db.query(`
                INSERT INTO auth_nonces (address, nonce, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            `, [normalizedWallet, nonce, Date.now() + 300000, Date.now()]); // 5 min expiry for nonce

            res.json({ ok: true, nonce, message });
        } catch (e) {
            console.error('[ReAuth] Start error:', e);
            res.status(500).json({ ok: false, error: 'Internal error' });
        }
    });

    // 2. Finish Reauth (Verify Sig -> Issue Token)
    router.post('/reauth/finish', async (req, res) => {
        try {
            const { wallet, scope, signature, nonce } = req.body;
            if (!wallet || !scope || !signature || !nonce) {
                return res.status(400).json({ ok: false, error: 'Missing fields' });
            }
            const normalizedWallet = wallet.toLowerCase();

            // Verify nonce exists and is valid
            const nonceRow = await db.get(`
                SELECT * FROM auth_nonces WHERE address = ? AND nonce = ? AND expires_at > ?
            `, [normalizedWallet, nonce, Date.now()]);

            if (!nonceRow) {
                return res.status(400).json({ ok: false, error: 'Invalid or expired nonce' });
            }

            // Verify signature
            // Reconstruct message
            const message = `Sign this message to confirm action: ${scope}\nNonce: ${nonce}\nDomain: ${req.get('host')}`;
            const recovered = ethers.verifyMessage(message, signature);

            if (recovered.toLowerCase() !== wallet.toLowerCase()) {
                return res.status(401).json({ ok: false, error: 'Invalid signature' });
            }

            // Consume nonce
            await db.query("DELETE FROM auth_nonces WHERE address = ? AND nonce = ?", [normalizedWallet, nonce]);

            // Issue Reauth Token
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashToken(token);
            const expiresAt = Date.now() + (REAUTH_TTL * 1000);

            await db.query(`
                INSERT INTO reauth_tokens (id, wallet, token_hash, scope, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                crypto.randomUUID(),
                normalizedWallet,
                tokenHash,
                scope,
                expiresAt,
                Date.now()
            ]);

            res.json({ ok: true, reauth_token: token, expires_at: expiresAt });
        } catch (e) {
            console.error('[ReAuth] Finish error:', e);
            res.status(500).json({ ok: false, error: 'Internal error' });
        }
    });

    // 3. Device Management (Protected by JWT)
    // List devices
    router.get('/account/devices', verifyJWT, async (req, res) => {
        try {
            if (!req.user || !req.user.wallet) return res.status(401).json({ ok: false, error: 'Unauthorized' });

            const devices = await db.query(`
                SELECT id, device_public_id, label, user_agent, last_seen_at, first_seen_at, status
                FROM trusted_devices
                WHERE wallet = ? AND status = 'active'
                ORDER BY last_seen_at DESC
            `, [req.user.wallet]);

            res.json({ ok: true, devices });
        } catch (e) {
            console.error('[Devices] List error:', e);
            res.status(500).json({ ok: false, error: 'Internal error' });
        }
    });

    // Revoke device (Requires Re-Auth)
    router.post('/account/devices/revoke', verifyJWT, (req, res, next) => requireReauth(db, 'revoke_device')(req, res, next), async (req, res) => {
        try {
            const { device_public_id } = req.body;
            if (!device_public_id) return res.status(400).json({ ok: false, error: 'Device ID required' });

            await db.query(`
                UPDATE trusted_devices SET status = 'revoked' 
                WHERE wallet = ? AND device_public_id = ?
            `, [req.user.wallet, device_public_id]);

            // Also should revoke any active sessions? 
            // Phase I2: Session binding checks valid check.
            // But we don't store sessions in DB (JWT).
            // So we rely on "Session Binding" middleware checking 'trusted_devices'.
            // I need to implement that middleware in Phase I2.2!

            res.json({ ok: true, message: 'Device revoked' });
        } catch (e) {
            console.error('[Devices] Revoke error:', e);
            res.status(500).json({ ok: false, error: 'Internal error' });
        }
    });

    return router;
}

// Middleware to check ReAuth Token
export function requireReauth(db, scope) {
    return async (req, res, next) => {
        try {
            const token = req.headers['x-reauth-token'];
            if (!token) {
                return res.status(403).json({
                    ok: false,
                    error: 'Reauth required',
                    code: 'REAUTH_REQUIRED',
                    scope
                });
            }

            const tokenHash = hashToken(token);
            const userWallet = req.user?.wallet; // Assumes requireAuth ran before

            if (!userWallet) {
                return res.status(401).json({ ok: false, error: 'Unauthorized' });
            }

            const validToken = await db.get(`
                SELECT * FROM reauth_tokens 
                WHERE wallet = ? 
                  AND token_hash = ? 
                  AND scope = ? 
                  AND expires_at > ?
                  AND used_at IS NULL
            `, [userWallet, tokenHash, scope, Date.now()]);

            if (!validToken) {
                return res.status(403).json({
                    ok: false,
                    error: 'Invalid or expired reauth token',
                    code: 'REAUTH_INVALID',
                    scope
                });
            }

            // Mark as used (One-Time Use)
            await db.query(`UPDATE reauth_tokens SET used_at = ? WHERE id = ?`, [Date.now(), validToken.id]);

            next();
        } catch (e) {
            console.error('[ReAuth] Middleware error:', e);
            res.status(500).json({ ok: false, error: 'Internal reauth error' });
        }
    };
}
