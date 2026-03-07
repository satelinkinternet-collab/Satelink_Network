export function attachSecurity(app, db) {
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

    const setFreeze = () => {
        try {
            db.prepare("UPDATE system_config SET value='1' WHERE key='security_freeze'").run();
            db.prepare("UPDATE system_config SET value='1' WHERE key='withdrawals_paused'").run();
        } catch (e) { }
    };

    const requireAdminKey = (req, res, next) => {
        const expectedKey = ADMIN_API_KEY;
        if (!expectedKey) {
            console.error("[SECURITY] ADMIN_API_KEY not set. Rejecting admin request.");
            return res.status(500).json({ ok: false, error: "ADMIN_API_KEY not configured" });
        }

        const provided = req.get("X-Admin-Key") || req.get("x-admin-key") || "";
        if (provided !== expectedKey) {
            app.locals.__authFailCount = (app.locals.__authFailCount || 0) + 1;
            if (app.locals.__authFailCount >= 10) {
                setFreeze();
            }
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }
        next();
    };

    // Expose middleware for other modules if needed (though routes.js will likely re-implement or we can attach it to app.locals)
    app.locals.requireAdminKey = requireAdminKey;

    // Abuse guard
    app.use((req, res, next) => {
        if (req.method === "POST" && (req.path === "/operations/execute" || req.path === "/usage/record")) {
            const { nodeWallet, opType } = req.body || {};
            if (nodeWallet && opType) {
                try {
                    const row = db
                        .prepare("SELECT SUM(ops) as totalOps FROM op_counts WHERE user_wallet=? AND op_type=?")
                        .get(nodeWallet, opType);
                    if (row?.totalOps >= 5000) {
                        return res.status(500).json({ ok: false, error: "Abuse Detected: operation spike" });
                    }
                } catch (e) { }
            }
        }
        next();
    });

    // Treasury guard
    app.use((req, res, next) => {
        if (req.method === "POST" && req.path === "/ledger/withdraw") {
            try {
                const row = db.prepare("SELECT SUM(amount) as s FROM revenue_events").get();
                const treasury = Number(row?.s || 0);
                if (treasury < 0) {
                    setFreeze();
                    return res.status(500).json({ ok: false, error: "WITHDRAWALS PAUSED: treasury unsafe" });
                }
            } catch (e) { }
        }
        next();
    });
}
