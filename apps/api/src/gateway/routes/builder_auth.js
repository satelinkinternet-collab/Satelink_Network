import { Router } from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ── SECURITY: Dedicated HMAC key for session cookies ──────────────────────
// Uses ADMIN_API_KEY exclusively. Fails fast if not configured.
// Previous code fell back to JWT_SECRET which conflates auth domains.
function getSessionHmacKey() {
    const key = process.env.ADMIN_API_KEY;
    if (!key) {
        throw new Error('ADMIN_API_KEY is required for builder session HMAC. No fallbacks allowed.');
    }
    return key;
}

// ── SECURITY: Cookie options — secure in production ───────────────────────
function cookieOpts(maxAge) {
    return {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge,
    };
}

export function createBuilderAuthRouter(opsEngine) {
    const router = Router();

    // Nonce storage — persisted in DB for production resilience
    // Falls back to in-memory Map only in dev/test when DB unavailable

    async function storeNonce(wallet, nonce) {
        try {
            await opsEngine.db.query(
                "INSERT OR REPLACE INTO auth_nonces (address, nonce, created_at, expires_at) VALUES (?, ?, ?, ?)",
                [wallet.toLowerCase(), nonce, Date.now(), Date.now() + 300000]
            );
        } catch (_) {
            // Fallback: in-memory if auth_nonces table doesn't exist yet
            if (!router._nonces) router._nonces = new Map();
            router._nonces.set(wallet.toLowerCase(), { nonce, expires: Date.now() + 300000 });
        }
    }

    async function getNonce(wallet) {
        try {
            const row = await opsEngine.db.get(
                "SELECT nonce FROM auth_nonces WHERE address = ? AND expires_at > ?",
                [wallet.toLowerCase(), Date.now()]
            );
            return row ? row.nonce : null;
        } catch (_) {
            if (!router._nonces) return null;
            const entry = router._nonces.get(wallet.toLowerCase());
            if (!entry || entry.expires < Date.now()) return null;
            return entry.nonce;
        }
    }

    async function deleteNonce(wallet) {
        try {
            await opsEngine.db.query(
                "DELETE FROM auth_nonces WHERE address = ?",
                [wallet.toLowerCase()]
            );
        } catch (_) {
            if (router._nonces) router._nonces.delete(wallet.toLowerCase());
        }
    }

    // 1. Challenge: Get nonce for wallet
    router.post('/auth/builder/challenge', (req, res) => {
        const { wallet } = req.body;
        if (!wallet) return res.status(400).json({ error: 'Wallet required' });

        const nonce = crypto.randomBytes(16).toString('hex');
        storeNonce(wallet, nonce).then(() => {
            res.json({ nonce });
        }).catch(e => {
            res.status(500).json({ error: 'Failed to generate nonce' });
        });
    });

    // 2. Verify: Check signature
    router.post('/auth/builder/verify', async (req, res) => {
        const { wallet, signature } = req.body;
        if (!wallet || !signature) return res.status(400).json({ error: 'Missing params' });

        const nonce = await getNonce(wallet);
        if (!nonce) return res.status(400).json({ error: 'Invalid or expired nonce' });

        try {
            // EIP-191 Signature Verification
            const msg = `Sign to login to Satelink Builder Console.\nNonce: ${nonce}`;
            const recoveredAddr = ethers.verifyMessage(msg, signature);

            if (recoveredAddr.toLowerCase() !== wallet.toLowerCase()) {
                return res.status(401).json({ error: 'Signature verification failed' });
            }

            // Success: Create/Update Builder
            await opsEngine.db.query(
                "INSERT OR IGNORE INTO builders (wallet, created_at) VALUES (?, ?)",
                [wallet.toLowerCase(), Date.now()]
            );

            // Generate JWT
            const token = jwt.sign(
                { wallet: wallet.toLowerCase(), role: 'builder' },
                process.env.JWT_SECRET,
                { expiresIn: '7d', issuer: 'satelink-core' }
            );

            // Set Session Cookie with dedicated HMAC key + secure flags
            const sessionData = JSON.stringify({ wallet: wallet.toLowerCase(), exp: Date.now() + 86400000 });
            const sessionSig = crypto.createHmac('sha256', getSessionHmacKey()).update(sessionData).digest('hex');
            res.cookie('builder_session', `${sessionData}.${sessionSig}`, cookieOpts(86400000));

            await deleteNonce(wallet);

            res.json({ success: true, token });
        } catch (e) {
            console.error("Auth Error:", e.message);
            res.status(500).json({ error: 'Internal Error' });
        }
    });

    // 3. Logout
    router.post('/auth/builder/logout', (req, res) => {
        res.clearCookie('builder_session');
        res.json({ success: true });
    });

    // 4. (DEV ONLY) Test Login
    if (process.env.NODE_ENV !== "production") {
        router.post('/__test/auth/builder/login', async (req, res) => {
            const { wallet } = req.body;
            if (!wallet) return res.status(400).json({ error: 'Wallet required' });

            // Create builder if not exists
            await opsEngine.db.query("INSERT OR IGNORE INTO builders (wallet, created_at) VALUES (?, ?)", [wallet.toLowerCase(), Date.now()]);

            // Generate JWT
            const token = jwt.sign(
                { wallet: wallet.toLowerCase(), role: 'builder' },
                process.env.JWT_SECRET,
                { expiresIn: '7d', issuer: 'satelink-core' }
            );

            // Use dedicated HMAC key for session cookie
            const hmacKey = process.env.ADMIN_API_KEY || process.env.JWT_SECRET; // Fallback OK in dev only
            const sessionData = JSON.stringify({ wallet: wallet.toLowerCase(), exp: Date.now() + 86400000 });
            const sessionSig = crypto.createHmac('sha256', hmacKey).update(sessionData).digest('hex');

            res.cookie('builder_session', `${sessionData}.${sessionSig}`, cookieOpts(86400000));
            res.json({ success: true, token });
        });
    }

    // Middleware to protect routes (Legacy Cookie)
    router.requireAuth = (req, res, next) => {
        const cookie = req.cookies['builder_session'];
        if (!cookie) return res.status(401).json({ error: 'Unauthorized' });

        try {
            const [dataStr, sig] = cookie.split('.');
            const validSig = crypto.createHmac('sha256', getSessionHmacKey()).update(dataStr).digest('hex');

            if (sig !== validSig) return res.status(401).json({ error: 'Invalid Session' });

            const data = JSON.parse(dataStr);
            if (Date.now() > data.exp) return res.status(401).json({ error: 'Session Expired' });

            req.builderWallet = data.wallet;
            next();
        } catch (e) {
            return res.status(401).json({ error: 'Invalid Session' });
        }
    };

    // Middleware to protect routes (JWT)
    router.verifyBuilder = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ ok: false, error: 'Invalid auth header format. Use Bearer <token>' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                issuer: 'satelink-core'
            });

            if (decoded.role !== 'builder') {
                return res.status(403).json({ ok: false, error: 'Forbidden: Insufficient role' });
            }

            req.user = decoded;
            next();
        } catch (e) {
            return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
        }
    };

    return router;
}
