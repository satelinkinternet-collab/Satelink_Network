/**
 * prod_guard.js
 *
 * Blocks dev/test/staging routes in production.
 * Must be mounted EARLY in the Express middleware chain.
 *
 * Blocked prefixes (when NODE_ENV=production):
 *   /__test, /dev, /staging
 *
 * No-op in non-production environments.
 */

const BLOCKED_PREFIXES = ["/__test", "/dev", "/staging"];

/**
 * Express middleware that returns 403 for blocked paths in production.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function prodGuard(req, res, next) {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const path = req.path || "";
  const isBlocked = BLOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );

  if (isBlocked) {
    console.warn(`[prod_guard] Blocked ${req.method} ${path} in production`);
    return res.status(403).json({ error: "Forbidden", path });
  }

  return next();
}
