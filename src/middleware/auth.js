export const createAdminAuth = (opsEngine) => (req, res, next) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
        if (opsEngine) opsEngine.recordAuthFailure(req.path, req.ip);
        return res.status(500).json({ error: "ADMIN_API_KEY not configured" });
    }

    const providedKey = req.headers["x-admin-key"];
    if (!providedKey || providedKey !== adminKey) {
        if (opsEngine) opsEngine.recordAuthFailure(req.path, req.ip);
        return res.status(401).json({ error: "Unauthorized admin access" });
    }
    next();
};

// For backward compatibility or simpler use
export function adminAuth(req, res, next) {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(500).json({ error: "ADMIN_API_KEY not configured" });

    const providedKey = req.headers["x-admin-key"];
    if (!providedKey || providedKey !== adminKey) {
        return res.status(401).json({ error: "Unauthorized admin access" });
    }
    next();
}
