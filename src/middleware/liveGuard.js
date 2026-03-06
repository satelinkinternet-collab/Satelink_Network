// src/middleware/liveGuard.js
import { isLive } from '../config/mode.js';

/**
 * Creates a middleware that blocks matching paths when running in Live mode.
 * @param {Object} options 
 * @param {string[]} options.contains - Array of string patterns to block if present in req.path
 */
export function blockInLive(options = {}) {
    const patterns = options.contains || [];

    return (req, res, next) => {
        if (isLive()) {
            const path = req.path;
            const shouldBlock = patterns.some(pattern => path.includes(pattern));
            if (shouldBlock) {
                return res.status(403).json({ ok: false, error: "Forbidden in LIVE mode" });
            }
        }
        next();
    };
}
