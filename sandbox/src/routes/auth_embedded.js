import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import rateLimit from 'express-rate-limit';

function hashIp(ip) {
    return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'satelink_salty')).digest('hex').substring(0, 16);
}

/**
 * Phase 37 — Embedded Wallet Auth Routes
 * JSON-only endpoints for signature-based login using nonces.
 */
export function createEmbeddedAuthRouter(db) {
    const router = Router();

    // Rate limit for starting auth to prevent nonce spam
    const authStartLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // 20 requests per IP per window
        message: { ok: false, error: 'Too many login attempts. Please try again later.' }
    });

    // In-memory tracker for address spam (IP -> Set of unique addresses requested)
    // In prod, this should be in Redis or DB
    const addressSpamTracker = new Map();

    // 1. POST /auth/embedded/start
    // Request a nonce to sign for an address
    router.post('/start', authStartLimiter, async (req, res) => {
        const { address } = req.body;
        if (!address) return res.status(400).json({ ok: false, error: 'Address required' });

        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

        // Address Spam Protection
        if (!addressSpamTracker.has(ip)) addressSpamTracker.set(ip, new Set());
        const seenAddresses = addressSpamTracker.get(ip);
        seenAddresses.add(address.toLowerCase());

        if (seenAddresses.size > 5) { // Max 5 unique addresses per IP per window
            return res.status(429).json({
                ok: false,
                error: 'Too many unique addresses requested from this IP. Abuse detected.'
            });
        }

        const nonce = crypto.randomBytes(16).toString('hex');
        const now = Date.now();
        const expiresAt = now + (5 * 60 * 1000); // 5 minutes

        try {
            await db.query(`
                INSERT INTO auth_nonces (address, nonce, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            `, [address.toLowerCase(), nonce, expiresAt, now]);

            res.json({
                ok: true,
                nonce,
                message_template: `Welcome to Satelink!\n\nAuthorize your device by signing this nonce: \${nonce}\n\nAddress: \${address}\nTimestamp: \${timestamp}`,
                expires_at: expiresAt,
                created_at: now
            });
        } catch (e) {
            console.error('[AUTH] Start failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    // 2. POST /auth/embedded/finish
    // Verify signature and issue JWT
    router.post('/finish', async (req, res) => {
        const { address, signature, device_public_id } = req.body;
        if (!address || !signature) {
            return res.status(400).json({ ok: false, error: 'Address and signature required' });
        }

        const addr = address.toLowerCase();

        try {
            // Find valid nonce
            const nonceRow = await db.get(`
                SELECT * FROM auth_nonces 
                WHERE address = ? AND used_at IS NULL AND expires_at > ?
                ORDER BY created_at DESC LIMIT 1
            `, [addr, Date.now()]);

            if (!nonceRow) {
                return res.status(401).json({ ok: false, error: 'Invalid or expired nonce' });
            }

            // Mark nonce as used
            await db.query('UPDATE auth_nonces SET used_at = ? WHERE id = ?', [Date.now(), nonceRow.id]);

            // Reconstruct message
            const message = `Welcome to Satelink!\n\nAuthorize your device by signing this nonce: ${nonceRow.nonce}\n\nAddress: ${address}\nTimestamp: ${nonceRow.created_at}`;

            // Verify signature
            const recoveredAddress = ethers.verifyMessage(message, signature);
            if (recoveredAddress.toLowerCase() !== addr) {
                // Telemetry: increment failure count
                await db.query('UPDATE users SET status = "flagged" WHERE primary_wallet = ?', [addr]).catch(() => { });
                console.warn(`[AUTH] Signature mismatch for ${addr} from ${req.ip}`);
                return res.status(401).json({ ok: false, error: 'Signature verification failed' });
            }

            // Upsert user
            let user = await db.get('SELECT * FROM users WHERE primary_wallet = ?', [addr]);
            const now = Date.now();

            if (!user) {
                await db.query(`
                    INSERT INTO users (primary_wallet, role, status, created_at, last_login_at)
                    VALUES (?, 'user', 'active', ?, ?)
                `, [addr, now, now]);
                user = await db.get('SELECT * FROM users WHERE primary_wallet = ?', [addr]);
            } else {
                await db.query('UPDATE users SET last_login_at = ? WHERE primary_wallet = ?', [now, addr]);
            }

            // Register Device (Phase I3)
            const ipHash = hashIp(req.ip || 'unknown');
            if (device_public_id) {
                await db.query(`
                    INSERT INTO trusted_devices (wallet, device_public_id, user_agent, ip_hash, first_seen_at, last_seen_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'active')
                    ON CONFLICT(wallet, device_public_id) DO UPDATE SET 
                        last_seen_at = excluded.last_seen_at,
                        ip_hash = excluded.ip_hash,
                        user_agent = excluded.user_agent
                `, [
                    addr,
                    device_public_id,
                    req.headers['user-agent'] || 'unknown',
                    ipHash,
                    now,
                    now
                ]).catch(err => console.error('[AUTH] Device register failed:', err));
            }

            // Issue JWT with Session Binding (Phase I2)
            const token = jwt.sign(
                {
                    wallet: addr,
                    role: user.role,
                    userId: user.id,
                    device_id: device_public_id || 'unknown',
                    ip_hash: ipHash
                },
                process.env.JWT_SECRET || 'dev_only_secret',
                { expiresIn: '7d', issuer: 'satelink-core' }
            );

            // Set httpOnly cookie
            res.cookie('satelink_session', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                ok: true,
                user: {
                    wallet: addr,
                    role: user.role,
                    status: user.status
                },
                token // Also return token for clients that prefer headers
            });

        } catch (e) {
            console.error('[AUTH] Finish failed:', e);
            res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    });

    // 3. POST /auth/logout
    router.post('/logout', (req, res) => {
        res.clearCookie('satelink_session');
        res.json({ ok: true, message: 'Logged out' });
    });

    return router;
}
