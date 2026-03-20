import { logger } from '../monitoring/logger.js';

/**
 * Canonical Withdrawal Service
 * Single source of truth for all withdrawal creation.
 * Every withdrawal route MUST go through this service.
 */

// In-memory per-wallet rate limit tracker
const withdrawRateMap = new Map(); // wallet -> [{ ts }]
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

/**
 * Check per-wallet withdrawal rate limit.
 * @param {string} wallet
 * @returns {{ allowed: boolean, remaining: number }}
 */
function checkRateLimit(wallet) {
    const now = Date.now();
    const key = wallet.toLowerCase();
    let entries = withdrawRateMap.get(key) || [];
    // Prune expired entries
    entries = entries.filter(e => now - e.ts < RATE_LIMIT_WINDOW_MS);
    withdrawRateMap.set(key, entries);
    return {
        allowed: entries.length < RATE_LIMIT_MAX,
        remaining: Math.max(0, RATE_LIMIT_MAX - entries.length)
    };
}

/**
 * Record a rate limit hit for a wallet.
 * @param {string} wallet
 */
function recordRateLimitHit(wallet) {
    const key = wallet.toLowerCase();
    const entries = withdrawRateMap.get(key) || [];
    entries.push({ ts: Date.now() });
    withdrawRateMap.set(key, entries);
}

/**
 * Execute a withdrawal through the canonical pipeline.
 *
 * @param {string} wallet - Destination wallet address
 * @param {number} amount - Amount in USDT
 * @param {object} opsEngine - OperationsEngine instance (has .db)
 * @param {object} [options]
 * @param {string} [options.sourceRoute] - The route that initiated this withdrawal
 * @returns {Promise<{ withdrawalId: number, status: string }>}
 */
export async function executeWithdrawal(wallet, amount, opsEngine, options = {}) {
    const sourceRoute = options.sourceRoute || 'unknown';

    // ── Validate wallet ──
    if (!wallet || typeof wallet !== 'string' || wallet.length < 10) {
        throw Object.assign(new Error('Invalid wallet address'), { statusCode: 400 });
    }

    // ── Validate amount ──
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !Number.isFinite(numAmount)) {
        throw Object.assign(new Error('Amount must be a positive number'), { statusCode: 400 });
    }

    // ── Rate limit check ──
    const rateCheck = checkRateLimit(wallet);
    if (!rateCheck.allowed) {
        throw Object.assign(
            new Error('Too many withdrawal requests. Max 5 per hour per wallet.'),
            { statusCode: 429 }
        );
    }

    // ── Check withdrawals_paused flag ──
    try {
        const paused = await opsEngine.db.get(
            "SELECT value FROM system_config WHERE key = 'withdrawals_paused'"
        );
        if (paused && paused.value === '1') {
            throw Object.assign(new Error('Withdrawals are currently paused'), { statusCode: 503 });
        }
    } catch (e) {
        if (e.statusCode) throw e;
        // system_config table may not exist yet — allow withdrawal
    }

    // ── Check security_freeze flag ──
    try {
        const frozen = await opsEngine.db.get(
            "SELECT value FROM system_config WHERE key = 'security_freeze'"
        );
        if (frozen && frozen.value === '1') {
            throw Object.assign(new Error('System is in security freeze'), { statusCode: 503 });
        }
    } catch (e) {
        if (e.statusCode) throw e;
    }

    // ── Treasury consistency check (liquidity-aware) ──
    let status = 'PENDING';
    try {
        const treasuryRow = await opsEngine.db.get(
            "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2"
        );
        const completedRow = await opsEngine.db.get(
            "SELECT COALESCE(SUM(amount_usdt), 0) as total FROM withdrawals WHERE status = 'COMPLETED'"
        );
        const treasuryBalance = Number(treasuryRow?.total || 0);
        const completedWithdrawals = Number(completedRow?.total || 0);
        const availableLiquidity = treasuryBalance - completedWithdrawals;

        if (numAmount > availableLiquidity) {
            // Do NOT reject — mark as PENDING for manual review
            status = 'PENDING';
            logger.warn({
                wallet,
                amount: numAmount,
                availableLiquidity,
                sourceRoute
            }, 'WITHDRAW_LIQUIDITY_CHECK: requested amount exceeds available liquidity, marking PENDING');
        }
    } catch (e) {
        // Treasury check failed — default to PENDING (safe)
        status = 'PENDING';
    }

    // ── Insert withdrawal row ──
    const now = Math.floor(Date.now() / 1000);
    const r = await opsEngine.db.query(
        "INSERT INTO withdrawals (wallet, amount_usdt, status, created_at) VALUES (?,?,?,?)",
        [wallet, numAmount, status, now]
    );

    let withdrawalId = r.lastInsertRowid;
    if (!withdrawalId && r.length > 0) withdrawalId = r[0].id;
    withdrawalId = Number(withdrawalId) || 0;

    // ── Record rate limit hit ──
    recordRateLimitHit(wallet);

    // ── Security logging ──
    logger.info({
        wallet,
        amount: numAmount,
        timestamp: now,
        withdrawalId,
        sourceRoute,
        status
    }, `WITHDRAW_REQUEST wallet=${wallet} amount=${numAmount} route=${sourceRoute}`);

    return { withdrawalId, status };
}

/**
 * Rate-limit middleware for withdrawal endpoints.
 * Attach to any route that creates withdrawals.
 */
export function withdrawRateLimitMiddleware(req, res, next) {
    const wallet = req.body?.wallet;
    if (!wallet) return next(); // Let the handler return its own 400
    const rateCheck = checkRateLimit(wallet);
    if (!rateCheck.allowed) {
        return res.status(429).json({
            ok: false,
            error: 'Too many withdrawal requests. Max 5 per hour per wallet.',
            remaining: 0,
            retry_after_seconds: 3600
        });
    }
    next();
}
