
import rateLimit from 'express-rate-limit';
import { appendDebugNdjson } from '../../utils/debug_ndjson.js';
// #region agent log
appendDebugNdjson({ runId: 'startup', hypothesisId: 'H12', location: 'rate_limits.js:module', message: 'rate_limits module loaded', data: {} });
try { fetch('http://127.0.0.1:7363/ingest/de7d16ec-a709-4735-b844-3889c63cdf77',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'14abae'},body:JSON.stringify({sessionId:'14abae',runId:'startup',hypothesisId:'H12',location:'rate_limits.js:module',message:'rate_limits module loaded',data:{},timestamp:Date.now()})}).catch(()=>{}); } catch {}
// #endregion

// express-rate-limit v7+ requires validate: false or using the built-in
// ipKeyGenerator when accessing req.ip in a custom keyGenerator.
// We disable the validation since we intentionally fall back to req.ip
// for unauthenticated requests and use wallet for authenticated ones.

/**
 * Must always return a non-empty string. JWTs from generateTokens use `walletAddress`;
 * older paths use `wallet` or `userId` (email-as-wallet).
 */
const keyGenerator = (req) => {
    const u = req.user;
    if (!u) return req.ip || 'unknown';
    // #region agent log
    if (u && !u.wallet && u.walletAddress && !globalThis.__sl_dbg_rateKeyWalletFallback) {
        globalThis.__sl_dbg_rateKeyWalletFallback = true;
        appendDebugNdjson({
            runId: 'post-fix-verify',
            hypothesisId: 'H10',
            location: 'rate_limits.js:keyGenerator',
            message: 'JWT had walletAddress but no wallet (rate-limit key would have been undefined before fix)',
            data: { hasUserId: !!u.userId },
        });
        try { fetch('http://127.0.0.1:7363/ingest/de7d16ec-a709-4735-b844-3889c63cdf77', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '14abae' },
            body: JSON.stringify({
                sessionId: '14abae',
                runId: 'post-fix-verify',
                hypothesisId: 'H10',
                location: 'rate_limits.js:keyGenerator',
                message: 'JWT had walletAddress but no wallet (rate-limit key would have been undefined before fix)',
                data: { hasUserId: !!u.userId },
                timestamp: Date.now(),
            }),
        }).catch(() => {}); } catch {}
    }
    // #endregion
    const id = u.wallet ?? u.walletAddress ?? u.userId;
    if (id != null && id !== '') return String(id);
    return req.ip || 'unknown';
};

export const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { ok: false, error: 'Too many requests' }
});

export const adminReadLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    keyGenerator,
    standardHeaders: true,
    validate: false,
    message: { ok: false, error: 'Admin rate limit exceeded' }
});

export const adminWriteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    keyGenerator,
    validate: false,
    message: { ok: false, error: 'Admin write limit exceeded' }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    validate: false,
    message: { ok: false, error: 'Too many login attempts' }
});
