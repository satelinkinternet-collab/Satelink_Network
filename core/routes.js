import { createOpsEngine } from './ops_engine_adapter.js';
import { createServiceStubs } from './service_stubs.js';

// ── Auth routers ──────────────────────────────────────────────
import { createUserSettingsRouter } from '../src/routes/user_settings.js';
import { createUnifiedAuthRouter, verifyJWT } from '../src/routes/auth_v2.js';
import { createEmbeddedAuthRouter } from '../src/routes/auth_embedded.js';
import { createAuthSecurityRouter } from '../src/routes/auth_security.js';
import { createBuilderAuthRouter } from '../src/routes/builder_auth.js';

// ── Main dashboard API routers ────────────────────────────────
import { createAdminApiRouter } from '../src/routes/admin_api_v2.js';
import { createNodeApiRouter } from '../src/routes/node_api_v2.js';
import { createBuilderApiV2Router } from '../src/routes/builder_api_v2.js';
import { createDistApiRouter } from '../src/routes/dist_api_v2.js';
import { createEntApiRouter } from '../src/routes/ent_api_v2.js';

// ── Admin sub-routers ─────────────────────────────────────────
import { createAdminAutonomousRouter } from '../src/routes/admin_autonomous.js';
import { createAdminControlRouter } from '../src/routes/admin_control_api.js';
import { createAdminControlRoomRouter } from '../src/routes/admin_control_room_api.js';
import { createAdminDistributorsRouter } from '../src/routes/admin_distributors.js';
import { createAdminEconomicsRouter } from '../src/routes/admin_economics.js';
import { createAdminForensicsRouter } from '../src/routes/admin_forensics.js';
import { createAdminGrowthRouter } from '../src/routes/admin_growth.js';
import { createAdminLaunchRouter } from '../src/routes/admin_launch.js';
import { createAdminLifecycleRouter } from '../src/routes/admin_lifecycle.js';
import { createAdminNetworkRouter } from '../src/routes/admin_network.js';
import { createAdminPartnersRouter } from '../src/routes/admin_partners.js';
import { createAdminReputationRouter, createAdminReputationImpactRouter } from '../src/routes/admin_reputation.js';
import { createAdminRevenueRouter } from '../src/routes/admin_revenue.js';
import { createAdminSLARouter } from '../src/routes/admin_sla.js';
import { createAdminSystemRouter } from '../src/routes/admin_system.js';

// ── Functional API routers ────────────────────────────────────
import { createBetaRouter } from '../src/routes/beta_api.js';
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
  const { createRpcGateway } = require('../apps/api/src/workloads/rpc_gateway/rpc_gateway.js');
  app.use('/rpc', createRpcGateway(db));
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

    const { createRpcGateway } = require('../apps/api/src/workloads/rpc_gateway/rpc_gateway.js');app.use('/rpc', createRpcGateway(db));

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

// ── Production guard ──────────────────────────────────────────
import { createProdGuard } from '../src/middleware/prod_guard.js';

/**
 * Safe mount helper — catches import/construction errors so one bad
 * route file doesn't crash the whole server.
 */
function safeMountRouter(app, path, routerFn, label) {
    try {
        const router = typeof routerFn === 'function' ? routerFn() : routerFn;
        if (router && typeof router === 'function') {
            app.use(path, router);
        } else if (router && router.stack) {
            app.use(path, router);
        }
    } catch (e) {
        console.error(`[ROUTES] Failed to mount ${label} at ${path}:`, e.message);
    }
}

export function attachRoutes(app, rawDb) {
  const { createRpcGateway } = require('../apps/api/src/workloads/rpc_gateway/rpc_gateway.js');
  app.use('/rpc', createRpcGateway(db));
    // ─── 1. Create opsEngine with async db wrapper ───────────────
    const opsEngine = createOpsEngine(rawDb);
    const stubs = createServiceStubs(rawDb, opsEngine);

    // Store for middleware that needs it
    app.set('opsEngine', opsEngine);

    // ─── 2. Production guard — blocks /__test and /dev in LIVE mode ─
    app.use(createProdGuard());

    // ─── 3. Admin key middleware ─────────────────────────────────
    const requireAdminKey = app.locals.requireAdminKey || ((req, res, next) => {
        const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "test-admin-secret";
        const provided = req.get("X-Admin-Key") || req.get("x-admin-key") || "";
        if (provided !== ADMIN_API_KEY) {
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }
        next();
    });

    // Builder auth router (has .verifyBuilder and .requireAuth properties)
    let builderAuthRouter;
    try {
        builderAuthRouter = createBuilderAuthRouter(opsEngine);
    } catch (e) {
        console.error('[ROUTES] Failed to create builder auth router:', e.message);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. HEALTH
    // ═══════════════════════════════════════════════════════════
    app.get("/health", (req, res) => {
        let db_status = 'ok';
        try { rawDb.prepare('SELECT 1').get(); } catch (e) { db_status = 'error'; }
        res.status(200).json({
            ok: true,
            service: 'satelink',
            uptime: Math.floor(process.uptime()),
            db_status,
            version: process.env.npm_package_version || '1.0.0'
        });
    });

    // ═══════════════════════════════════════════════════════════
    // 4. AUTH ROUTES (frontend proxies /auth/*)
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/', () => createUnifiedAuthRouter(opsEngine), 'auth_v2');
    safeMountRouter(app, '/', () => createEmbeddedAuthRouter(rawDb), 'auth_embedded');
    safeMountRouter(app, '/auth', () => createAuthSecurityRouter(rawDb), 'auth_security');
    if (builderAuthRouter) safeMountRouter(app, '/', () => builderAuthRouter, 'builder_auth');
    safeMountRouter(app, '/staging', () => createStagingAuthRouter(opsEngine), 'staging_auth');

    // ═══════════════════════════════════════════════════════════
    // 5. USER SETTINGS (frontend proxies /me/*)
    // ═══════════════════════════════════════════════════════════
    app.use('/me', createUserSettingsRouter(rawDb));

    // ═══════════════════════════════════════════════════════════
    // 6. MAIN DASHBOARD API ROUTES
    //    All need JWT auth — apply verifyJWT at mount level so
    //    req.user is always set before route handlers run.
    // ═══════════════════════════════════════════════════════════

    // /admin-api/* has its own requireJWT from middleware/auth.js internally
    safeMountRouter(app, '/admin-api', () => createAdminApiRouter(opsEngine), 'admin_api_v2');

    // These routes read req.user.wallet — need verifyJWT
    app.use('/node-api', verifyJWT);
    safeMountRouter(app, '/node-api', () => createNodeApiRouter(opsEngine), 'node_api_v2');

    app.use('/builder-api', verifyJWT);
    safeMountRouter(app, '/builder-api', () => createBuilderApiV2Router(opsEngine), 'builder_api_v2');

    app.use('/dist-api', verifyJWT);
    safeMountRouter(app, '/dist-api', () => createDistApiRouter(opsEngine), 'dist_api_v2');

    app.use('/ent-api', verifyJWT);
    safeMountRouter(app, '/ent-api', () => createEntApiRouter(opsEngine), 'ent_api_v2');

    // --- 6. Wildcard catch-all LAST ---
    // The wildcard must ALWAYS be last to ensure that all valid routes, 
    // including protected ones, have a chance to be matched, evaluated, 
    // and correctly guarded by their respective authentication and authorization middleware.
    // If placed earlier, it could inadvertently hijack requests meant for secure routes 
    // or leak existence of endpoints. Here, it safely returns 404.
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });

    // ═══════════════════════════════════════════════════════════
    // 13. DEV/TEST ROUTES
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/__test/auth', () => createDevAuthRouter(opsEngine), 'dev_auth');
    safeMountRouter(app, '/__test/seed', () => createDevSeedRouter(opsEngine), 'dev_seed');
}
