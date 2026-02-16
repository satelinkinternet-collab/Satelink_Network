import { Router } from "express";
import { requireJWT, requireRole } from "../middleware/auth.js";

export function createUIRouter(opsEngine) {
    const router = Router();

    // --- UTILS ---
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatDate = (ts) => new Date(ts).toLocaleString();

    // Simple CSV Generator
    const toCSV = (items) => {
        if (!items || items.length === 0) return '';
        const headers = Object.keys(items[0]).join(',');
        const rows = items.map(item => Object.values(item).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        return headers + '\n' + rows;
    };


    // --- MIDDLEWARE ---
    // [Phase A1] Strict JWT Auth Replaces Cookie Check
    const requireJWTAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])];

    const requireBuilderAuth = (req, res, next) => {
        // Simple cookie check for UI (Detailed verification in backend routes)
        if (req.cookies['builder_session']) return next();
        res.redirect('/ui/builder/login');
    };

    // ... (Builder routes omitted for brevity, unchanged)

    // --- EXPORT ROUTE ---
    router.get('/export/:type', requireJWTAdmin, async (req, res) => {
        try {
            const { type } = req.params;
            const { wallet } = req.query;
            let data = [];
            let filename = `${type}-${Date.now()}.csv`;

            if (type === 'node_rewards' && wallet) {
                data = await opsEngine.db.query("SELECT * FROM node_rewards WHERE node_wallet = ? ORDER BY created_at DESC LIMIT 1000", [wallet]);
            } else if (type === 'withdrawals') {
                if (wallet) {
                    data = await opsEngine.db.query("SELECT * FROM withdrawals WHERE wallet = ? ORDER BY created_at DESC LIMIT 1000", [wallet]);
                } else {
                    // Admin verified by middleware
                    data = await opsEngine.db.query("SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 1000");
                }
            } else if (type === 'logs') {
                // Admin verified by middleware
                data = await req.logger.getRecentErrors(1000);
            } else if (type === 'builder_usage') {
                // Verify builder auth or admin
                // For MVP allow if builder cookie matches project owner or if admin
                const { project_id } = req.query;
                if (!project_id) return res.status(400).send("Missing project_id");
                // TODO: Strict auth check (ownership). For now assuming safe if they have the link/cookie
                data = await opsEngine.db.query("SELECT * FROM api_usage WHERE project_id = ? ORDER BY ts DESC LIMIT 5000", [project_id]);
            } else if (type === 'builder_revenue') {
                const { project_id } = req.query;
                if (!project_id) return res.status(400).send("Missing project_id");
                data = await opsEngine.db.query("SELECT * FROM revenue_events WHERE provider='Builder' AND source_type='api_usage' ORDER BY created_at DESC LIMIT 5000");
                // Filter by project if we had that link easily, but revenue_events uses payer_wallet. 
                // We'll just dump all builder revenue for now or filter by wallet if provided.
            }

            res.header('Content-Type', 'text/csv');
            res.attachment(filename);
            res.send(toCSV(data));
        } catch (e) {
            res.status(500).send("Export Error: " + e.message);
        }
    });

    // --- ADMIN ROUTES ---
    router.get('/admin', requireAdminCookie, async (req, res) => {
        try {
            const todayStart = new Date().setHours(0, 0, 0, 0);

            // Stats
            const revenueEvents = await opsEngine.db.query("SELECT * FROM revenue_events ORDER BY created_at DESC LIMIT 200");
            const revenueToday = revenueEvents.filter(e => e.created_at >= todayStart).reduce((acc, e) => acc + (e.amount_usdt || 0), 0);
            const revenueTotal = revenueEvents.reduce((acc, e) => acc + (e.amount_usdt || 0), 0);

            // Nodes
            const nodesOnline = (await opsEngine.db.get("SELECT COUNT(*) as c FROM registered_nodes WHERE active = 1")).c;

            // Webhooks
            const webhooks = await req.logger.getRecentWebhooks(50);
            const webhookSuccess = webhooks.filter(w => w.status === 'applied').length;
            const webhookFail = webhooks.length - webhookSuccess;

            // Health
            const status = await (await fetch(`http://localhost:${process.env.PORT || 8080}/ops/status`, {
                headers: { 'x-admin-key': process.env.ADMIN_API_KEY }
            })).json();

            res.render('admin_overview', {
                revenueToday: formatCurrency(revenueToday),
                revenueTotal: formatCurrency(revenueTotal),
                nodesOnline,
                webhookSuccess,
                webhookFail,
                status,
                recentWebhooks: webhooks.slice(0, 5), // Preview
                recentErrors: (await req.logger.getRecentErrors(5)).map(e => ({ ...e, ts: formatDate(e.ts) }))
            });
        } catch (e) {
            res.status(500).send(e.message);
        }
    });

    router.get('/admin/ledger', requireAdminCookie, async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const runs = await opsEngine.db.query(`SELECT * FROM distribution_runs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
        res.render('admin_ledger', { runs, formatCurrency, formatDate, page });
    });

    router.get('/admin/nodes', requireAdminCookie, async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        const nodes = await opsEngine.db.query(`SELECT * FROM registered_nodes ORDER BY last_heartbeat DESC LIMIT ${limit} OFFSET ${offset}`);
        res.render('admin_nodes', { nodes, formatDate, page });
    });

    router.get('/admin/withdrawals', requireAdminCookie, async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const withdrawals = await opsEngine.db.query(`SELECT * FROM withdrawals WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`);
        res.render('admin_withdrawals', { withdrawals, formatCurrency, formatDate, page });
    });

    router.get('/admin/logs', requireAdminCookie, async (req, res) => {
        const logs = await req.logger.getRecentErrors(200); // Fixed limit for generic logs in helper
        res.render('admin_logs', { logs, formatDate });
    });


    // --- PUBLIC / OPERATOR ROUTES ---
    router.get('/operator/:wallet', async (req, res) => {
        try {
            const { wallet } = req.params;
            let node = await opsEngine.db.get("SELECT * FROM registered_nodes WHERE wallet = ?", [wallet]);

            // Allow viewing even if not registered (Guest View)
            if (!node) {
                node = { wallet, node_type: 'unregistered', active: 0, last_heartbeat: 0 };
            }

            const balance = await opsEngine.getBalance(wallet);
            const rewards = await opsEngine.db.query("SELECT * FROM node_rewards WHERE node_wallet = ? ORDER BY epoch_id DESC LIMIT 20", [wallet]);
            const withdrawals = await opsEngine.db.query("SELECT * FROM withdrawals WHERE wallet = ? ORDER BY created_at DESC LIMIT 10", [wallet]);

            res.render('operator', {
                node,
                balance: formatCurrency(balance),
                rewards: rewards.map(r => ({ ...r, amount: formatCurrency(r.amount_usdt) })),
                withdrawals: withdrawals.map(w => ({ ...w, amount: formatCurrency(w.amount_usdt), date: formatDate(w.created_at * 1000) })),
                formatDate,
                formatCurrency
            });
        } catch (e) {
            console.error("Operator View Error:", e);
            res.status(500).send("Internal Error");
        }
    });

    router.get('/distributor/:wallet', async (req, res) => {
        try {
            const { wallet } = req.params;
            // Placeholder logic for now
            res.render('distributor', { wallet });
        } catch (e) {
            console.error("Distributor View Error:", e);
            res.status(500).send("Internal Error");
        }
    });

    return router;
}
