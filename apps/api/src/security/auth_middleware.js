import jwt from "jsonwebtoken";

/**
 * Role-based access control middleware factory.
 * Usage: requireRole(['admin_super', 'admin_ops'])
 * Must be used AFTER requireJWT (which sets req.user).
 */
export function requireRole(allowedRoles) {
  if (!Array.isArray(allowedRoles)) {
    throw new Error('requireRole expects an array of role strings');
  }
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

export const ADMIN_ROLES = ['admin_super', 'admin_ops', 'admin_readonly', 'admin'];

export function requireJWT(req, res, next) {
  try {
    if (!req || !res) {
      console.error("AUTH FATAL: req/res undefined — fail closed");
      throw new Error('requireJWT: req or res is undefined');
    }

    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authorization header with Bearer token required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err.message);

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token"
    });
  }
}
