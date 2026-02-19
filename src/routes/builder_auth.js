import { Router } from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export function createBuilderAuthRouter(opsEngine) {
    const router = Router();

    // In-memory nonce store (Production: use Redis)
    const nonces = new Map();

    // 1. Challenge: Get nonce for wallet
    router.post('/auth/builder/challenge', (req, res) => {
        const { wallet } = req.body;
        if (!wallet) return res.status(400).json({ error: 'Wallet required' });

        const nonce = crypto.randomBytes(16).toString('hex');
        nonces.set(wallet.toLowerCase(), nonce);

        // Expire nonce after 5 mins
        setTimeout(() => nonces.delete(wallet.toLowerCase()), 300000);

        res.json({ nonce });
    });

    // 2. Verify: Check signature
    router.post('/auth/builder/verify', async (req, res) => {
        const { wallet, signature } = req.body;
        if (!wallet || !signature) return res.status(400).json({ error: 'Missing params' });

        const nonce = nonces.get(wallet.toLowerCase());
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
                process.env.JWT_SECRET || 'dev_only_secret',
                { expiresIn: '7d', issuer: 'satelink-core' }
            );

            // Set Session Cookie (Legacy Support)
            const sessionData = JSON.stringify({ wallet: wallet.toLowerCase(), exp: Date.now() + 86400000 });
            const sessionSig = crypto.createHmac('sha256', process.env.ADMIN_API_KEY || 'secret').update(sessionData).digest('hex');
            res.cookie('builder_session', `${sessionData}.${sessionSig}`, { httpOnly: true, maxAge: 86400000 });

            nonces.delete(wallet.toLowerCase());

            res.json({ success: true, token });
        } catch (e) {
            console.error("Auth Error:", e);
            res.status(500).json({ error: 'Internal Error' });
        }
    });

    // 3. Logout
    router.post('/auth/builder/logout', (req, res) => {
        res.clearCookie('builder_session');
        res.json({ success: true });
    });

    // 4. (DEV ONLY) Test Login
    router.post('/__test/auth/builder/login', async (req, res) => {
      if (process.env.NODE_ENV === "production") return res.status(404).send("Not Found");

        if (process.env.NODE_ENV === "production") {
            return res.status(404).json({ ok: false });
        }

        const { wallet } = req.body;
        if (!wallet) return res.status(400).json({ error: 'Wallet required' });

        // Create builder if not exists
        await opsEngine.db.query("INSERT OR IGNORE INTO builders (wallet, created_at) VALUES (?, ?)", [wallet.toLowerCase(), Date.now()]);

        // Generate JWT
        const token = jwt.sign(
            { wallet: wallet.toLowerCase(), role: 'builder' },
            process.env.JWT_SECRET || 'dev_only_secret',
            { expiresIn: '7d', issuer: 'satelink-core' }
        );

        const sessionData = JSON.stringify({ wallet: wallet.toLowerCase(), exp: Date.now() + 86400000 });
        const sessionSig = crypto.createHmac('sha256', process.env.ADMIN_API_KEY || 'secret').update(sessionData).digest('hex');

        res.cookie('builder_session', `${sessionData}.${sessionSig}`, { httpOnly: true, maxAge: 86400000 });
        res.json({ success: true, token });
    });

    // Middleware to protect routes (Legacy Cookie)
    router.requireAuth = (req, res, next) => {
        const cookie = req.cookies['builder_session'];
        if (!cookie) return res.status(401).json({ error: 'Unauthorized' });

        const [dataStr, sig] = cookie.split('.');
        const validSig = crypto.createHmac('sha256', process.env.ADMIN_API_KEY || 'secret').update(dataStr).digest('hex');

        if (sig !== validSig) return res.status(401).json({ error: 'Invalid Session' });

        const data = JSON.parse(dataStr);
        if (Date.now() > data.exp) return res.status(401).json({ error: 'Session Expired' });

        req.builderWallet = data.wallet;
        next();
    };

    // Middleware to protect routes (JWT)
    router.verifyBuilder = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ ok: false, error: 'Invalid auth header format. Use Bearer <token>' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_only_secret', {
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
