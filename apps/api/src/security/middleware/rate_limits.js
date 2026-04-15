
import rateLimit from 'express-rate-limit';

// express-rate-limit v7+ requires validate: false or using the built-in
// ipKeyGenerator when accessing req.ip in a custom keyGenerator.
// We disable the validation since we intentionally fall back to req.ip
// for unauthenticated requests and use wallet for authenticated ones.

const keyGenerator = (req) => {
    return req.user ? req.user.wallet : req.ip;
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

// Money-endpoint limiter. Keyed on authenticated identity when present
// (so one compromised token can't fan out across IPs), tighter than the
// general admin write limiter because withdrawals move USDT on-chain.
// Defensive keygen: JWT payload shape varies across routes — some sign
// `wallet`, others `walletAddress`, so we fall through to userId then IP.
export const withdrawLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        const u = req.user;
        return (u && (u.wallet || u.walletAddress || u.userId)) || req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { ok: false, error: 'Withdrawal rate limit exceeded' }
});

// Limiter for enterprise-billed request paths. Keys on the X-Enterprise-Key
// header when present so one misbehaving client can't exhaust shared IP
// budget; falls back to IP for missing/invalid keys.
export const billingLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    keyGenerator: (req) => req.get('X-Enterprise-Key') || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { ok: false, error: 'Billed endpoint rate limit exceeded' }
});
