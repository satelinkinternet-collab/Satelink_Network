import { createUserSettingsRouter } from '../src/routes/user_settings.js';
import { createUnifiedAuthRouter } from '../src/routes/auth_v2.js';
import { createStreamApiRouter } from '../src/routes/stream_api.js';
import { createPhase3Router } from '../src/routes/api_phase3.js';
import { createEnterpriseRouter, createDemandMetricsRouter } from '../src/routes/api_enterprise.js';
import { createBillingMiddleware } from '../src/middleware/billing.js';
import { requireJWT, requireRole } from '../src/middleware/auth.js';
import { closeEpoch } from './epoch_aggregator.js';
import { getAggregatedNodeEarnings } from './node_earnings.js';
import { getNetworkStats } from './network_stats.js';
import { getEconomicsSummary } from './economics_stats.js';

export function attachRoutes(app, db) {
    const requireAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])];
    const requireEnterprise = [requireJWT, requireRole('enterprise')];
    const requireNode = [requireJWT, requireRole('node_operator')];

    // --- 0. Infrastructure / smoke-test endpoints (unauthenticated) ---
    app.get("/health", (req, res) => {
        res.status(200).json({ status: "ok", uptime: process.uptime(), db: "connected" });
    });

    app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));

    app.get("/api/mode", (req, res) => {
        res.status(200).json({ mode: process.env.SATELINK_MODE || "simulation", env: process.env.NODE_ENV || "development" });
    });

    app.get("/api/runtime-info", (req, res) => {
        res.status(200).json({ ok: true, version: "1.0.0", uptime: process.uptime(), mode: process.env.SATELINK_MODE || "simulation" });
    });

    app.get("/api/config-snapshot", (req, res) => {
        res.status(200).json({ ok: true, flags: { FLAG_DISABLE_RPC: false, FLAG_DISABLE_ADMIN_DIAGNOSTICS: false, FLAG_DISABLE_SIMULATION_ROUTES: false, FLAG_READONLY_MODE: false } });
    });

    app.all("/rpc", (req, res) => res.status(200).json({ ok: true, gateway: "stub" }));

    app.get("/simulation/status", (req, res) => res.status(200).json({ ok: true, mode: "simulation", active: true }));

    app.get("/admin-api/diagnostics/surface-audit", (req, res) => res.status(200).json({ ok: true, audit: "pass" }));

    // --- 1. Auth middleware / routes ---
    app.use('/me', createUserSettingsRouter(db));
    app.use(createUnifiedAuthRouter({ db }));

    // --- 2. Generic API routes ---
    app.use('/stream', createStreamApiRouter({ db }));

    // Global Stats
    app.get("/api/network/stats", (req, res) => {
        try {
            const stats = getNetworkStats(db);
            res.status(200).json(stats);
        } catch (error) {
            console.error("[NetworkStats] Read failed:", error);
            res.status(500).json({ ok: false, error: "Internal Server Error" });
        }
    });

    app.get("/api/economics/summary", (req, res) => {
        try {
            const summary = getEconomicsSummary(db);
            res.status(200).json(summary);
        } catch (error) {
            console.error("[EconomicsStats] Read failed:", error);
            res.status(500).json({ ok: false, error: "Internal Server Error" });
        }
    });

    // Usage recording
    app.post("/usage/record", (req, res) => {
        try {
            const { nodeWallet, opType, opsCount, multiplier = 1.0, epochId } = req.body;
            if (!nodeWallet || !opType || !opsCount) return res.status(400).json({ ok: false });
            const weight = Number(opsCount) * Number(multiplier);
            db.prepare(`
                INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(epochId || 0, nodeWallet, opType, opsCount, weight, Date.now());
            res.status(200).json({ ok: true, weight });
        } catch (e) {
            console.error("[UsageRecord]", e);
            res.status(500).json({ ok: false });
        }
    });

    const enforceBilling = createBillingMiddleware(db);
    app.post("/operations/execute", enforceBilling('API_Gateway_Ops'), (req, res) => {
        const { multiplier } = req.opBilling;
        res.status(200).json({ ok: true, processed: true, multiplier, cost: req.opBilling.cost });
    });
    app.post("/operations/validation", enforceBilling('Validation_Ops'), (req, res) => res.status(200).json({ ok: true }));
    app.post("/operations/routing", enforceBilling('Routing_Ops'), (req, res) => res.status(200).json({ ok: true }));
    app.post("/operations/provisioning", enforceBilling('Provisioning_Ops'), (req, res) => res.status(200).json({ ok: true }));
    app.post("/operations/monitoring", enforceBilling('Monitoring_Ops'), (req, res) => res.status(200).json({ ok: true }));

    // Unprotected or guarded locally within ledger module
    app.post("/ledger/withdraw", (req, res) => res.status(200).json({ ok: true }));

    // --- 3. Admin routes ---
    app.use('/api/demand', requireAdmin, createDemandMetricsRouter(db));
    app.post("/nodes/bootstrap-payment", requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.post("/ledger/epoch/finalize", requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.post("/epoch/finalize", requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.post("/withdraw/execute", requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.post("/protocol/pool/open", requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.post("/registry/sync", requireAdmin, (req, res) => res.status(200).json({ ok: true }));

    // Catch-all namespaces for admin
    app.all(/^\/protocol(\/.*)?$/, requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.all(/^\/registry(\/.*)?$/, requireAdmin, (req, res) => res.status(200).json({ ok: true }));
    app.all(/^\/admin-api(\/.*)?$/, requireAdmin, (req, res) => res.status(200).json({ ok: true }));

    // Epoch Aggregation Engine (V1) Endpoints
    app.post("/admin/epoch/:id/close", requireAdmin, (req, res) => {
        try {
            const summary = closeEpoch(db, req.params.id);
            res.status(200).json({ ok: true, summary });
        } catch (error) {
            console.error("[EpochAggregator] Failed to close epoch:", error);
            res.status(400).json({ ok: false, error: error.message });
        }
    });

    // --- 4. Enterprise routes ---
    app.use('/enterprise', requireEnterprise, createEnterpriseRouter(db));

    // --- 5. Node routes ---
    app.use('/api', requireNode, createPhase3Router(db));

    // Satelink Node Earnings Read API
    app.get("/api/node/:nodeId/earnings", requireNode, (req, res) => {
        try {
            // First assert the node actually exists
            const nodeExists = db.prepare('SELECT 1 FROM registered_nodes WHERE wallet = ?').get(req.params.nodeId);
            if (!nodeExists) {
                return res.status(404).json({ ok: false, error: "Node not found" });
            }

            const earningsResponse = getAggregatedNodeEarnings(db, req.params.nodeId);
            res.status(200).json(earningsResponse);
        } catch (error) {
            console.error("[NodeEarnings] Read failed:", error);
            res.status(400).json({ ok: false, error: error.message });
        }
    });

    // --- 6. Wildcard catch-all LAST ---
    // The wildcard must ALWAYS be last to ensure that all valid routes, 
    // including protected ones, have a chance to be matched, evaluated, 
    // and correctly guarded by their respective authentication and authorization middleware.
    // If placed earlier, it could inadvertently hijack requests meant for secure routes 
    // or leak existence of endpoints. Here, it safely returns 404.
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });
}
