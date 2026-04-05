
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
