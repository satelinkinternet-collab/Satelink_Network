import { createUserSettingsRouter } from '../src/routes/user_settings.js';
import { createUnifiedAuthRouter } from '../src/routes/auth_v2.js';

export function attachRoutes(app, db) {
    const requireAdminKey = app.locals.requireAdminKey || ((req, res, next) => {
        const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "satelink-admin-secret";
        const provided = req.get("X-Admin-Key") || req.get("x-admin-key") || "";
        if (provided !== ADMIN_API_KEY) {
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }
        next();
    });

    // Readiness check
    app.get("/health", (req, res) => res.status(200).json({ ok: true }));

    // Admin protected endpoints
    app.post("/nodes/bootstrap-payment", requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    app.post("/ledger/epoch/finalize", requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    app.post("/epoch/finalize", requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    app.post("/withdraw/execute", requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    app.post("/protocol/pool/open", requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    app.post("/registry/sync", requireAdminKey, (req, res) => res.status(200).json({ ok: true }));

    // Unprotected (guards handle these)
    app.post("/ledger/withdraw", (req, res) => res.status(200).json({ ok: true }));
    app.post("/operations/execute", (req, res) => res.status(200).json({ ok: true }));
    app.post("/usage/record", (req, res) => res.status(200).json({ ok: true }));

    // Catch-all protection for namespaces
    app.all(/^\/protocol(\/.*)?$/, requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    app.all(/^\/registry(\/.*)?$/, requireAdminKey, (req, res) => res.status(200).json({ ok: true }));
    // Admin-api (tests use this too)
    app.all(/^\/admin-api(\/.*)?$/, requireAdminKey, (req, res) => res.status(200).json({ ok: true }));

    // Mount user settings router
    app.use('/me', createUserSettingsRouter(db));
    app.use(createUnifiedAuthRouter({ db }));
}
