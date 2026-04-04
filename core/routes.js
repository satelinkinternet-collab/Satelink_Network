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
import { createUsageIngestRouter } from '../src/routes/usage_ingest.js';
import { createLedgerRouter } from '../src/routes/ledger.js';
import { createPairApiRouter } from '../src/routes/pair_api.js';
import { createOpsRouter } from '../src/routes/ops.js';

// ── Support / Partner / Node lifecycle ────────────────────────
import { createSupportRouter } from '../src/routes/support.js';
import { createPartnerPortalRouter } from '../src/routes/partner_portal.js';
import { createNodeLifecycleRouter } from '../src/routes/node_lifecycle.js';

// ── Public routers ────────────────────────────────────────────
import { createPublicStatusRouter } from '../src/routes/public_status.js';
import { createPublicNodeRouter } from '../src/routes/public_node.js';
import { createPublicPartnersRouter } from '../src/routes/public_partners.js';
import { createPublicMarketplaceRouter } from '../src/routes/public_marketplace.js';

// ── Dev/test routers ──────────────────────────────────────────
import { createDevAuthRouter } from '../src/routes/dev_auth_tokens.js';
import { createDevSeedRouter } from '../src/routes/dev_seed.js';
import { createStagingAuthRouter } from '../src/routes/staging_auth.js';

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

    // ═══════════════════════════════════════════════════════════
    // 7. ADMIN SUB-ROUTES (frontend proxies /admin-ctrl/* → /admin/*)
    //    Apply verifyJWT at /admin level so all sub-routes get req.user.
    // ═══════════════════════════════════════════════════════════
    app.use('/admin', verifyJWT);
    safeMountRouter(app, '/admin', () => createAdminControlRouter(opsEngine, stubs.auditService), 'admin_control');
    safeMountRouter(app, '/admin', () => createAdminControlRoomRouter(opsEngine, {
        selfTestRunner: null,
        incidentBuilder: null,
        opsReporter: null,
        auditService: stubs.auditService
    }), 'admin_control_room');
    safeMountRouter(app, '/admin/autonomous', () => createAdminAutonomousRouter(opsEngine.db, stubs.autoOpsEngine), 'admin_autonomous');
    safeMountRouter(app, '/admin/distributors', () => createAdminDistributorsRouter(opsEngine.db), 'admin_distributors');
    safeMountRouter(app, '/admin/economics', () => createAdminEconomicsRouter(
        opsEngine.db, stubs.breakevenService, stubs.authenticityService, stubs.stabilityService
    ), 'admin_economics');
    safeMountRouter(app, '/admin/economics', () => createAdminReputationImpactRouter(opsEngine.db), 'admin_reputation_impact');
    safeMountRouter(app, '/admin/forensics', () => createAdminForensicsRouter(opsEngine.db, stubs.forensicsServices), 'admin_forensics');
    safeMountRouter(app, '/admin', () => createAdminGrowthRouter(opsEngine.db, stubs.retentionService), 'admin_growth');
    safeMountRouter(app, '/admin/launch', () => createAdminLaunchRouter(opsEngine.db), 'admin_launch');
    safeMountRouter(app, '/admin/network', () => createAdminLifecycleRouter(opsEngine.db), 'admin_lifecycle');
    safeMountRouter(app, '/admin/network', () => createAdminNetworkRouter(opsEngine.db, stubs.densityService), 'admin_network');
    safeMountRouter(app, '/admin/network', () => createAdminReputationRouter(opsEngine.db), 'admin_reputation');
    safeMountRouter(app, '/admin/partners', () => createAdminPartnersRouter(opsEngine.db), 'admin_partners');
    safeMountRouter(app, '/admin/partners', () => createAdminSLARouter(opsEngine.db, stubs.slaEngine), 'admin_sla');
    safeMountRouter(app, '/admin', () => createAdminRevenueRouter(opsEngine.db, stubs.auditService), 'admin_revenue');
    safeMountRouter(app, '/admin/system', () => createAdminSystemRouter(opsEngine, null, null, null), 'admin_system');

    // ═══════════════════════════════════════════════════════════
    // 8. STREAMING (frontend proxies /stream/*)
    // ═══════════════════════════════════════════════════════════
    app.use('/stream', verifyJWT);
    safeMountRouter(app, '/stream', () => createStreamApiRouter(opsEngine), 'stream_api');

    // ═══════════════════════════════════════════════════════════
    // 9. SUPPORT (frontend proxies /support/*)
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/support', () => createSupportRouter(opsEngine.db), 'support');

    // ═══════════════════════════════════════════════════════════
    // 10. FUNCTIONAL API ROUTES
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/ledger', () => createLedgerRouter(opsEngine, requireAdminKey), 'ledger');
    safeMountRouter(app, '/beta', () => createBetaRouter(opsEngine), 'beta');
    safeMountRouter(app, '/ops', () => createOpsRouter(opsEngine, requireAdminKey), 'ops');
    safeMountRouter(app, '/pair', () => createPairApiRouter(opsEngine), 'pair');
    safeMountRouter(app, '/usage', () => createUsageIngestRouter(opsEngine), 'usage_ingest');

    // ═══════════════════════════════════════════════════════════
    // 11. NODE LIFECYCLE & PARTNER PORTAL
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/node', () => createNodeLifecycleRouter(opsEngine.db), 'node_lifecycle');
    safeMountRouter(app, '/partner', () => createPartnerPortalRouter(opsEngine.db, stubs.slaEngine), 'partner_portal');

    // ═══════════════════════════════════════════════════════════
    // 12. PUBLIC ROUTES (no auth needed)
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/status', () => createPublicStatusRouter(opsEngine.db, null), 'public_status');
    safeMountRouter(app, '/public/node', () => createPublicNodeRouter(opsEngine.db), 'public_node');
    safeMountRouter(app, '/partners', () => createPublicPartnersRouter(opsEngine.db), 'public_partners');
    safeMountRouter(app, '/network/marketplace', () => createPublicMarketplaceRouter(opsEngine.db), 'public_marketplace');

    // GET /api-docs — OpenAPI spec (public, no auth)
    app.get('/api-docs', (req, res) => {
        res.json({
            openapi: '3.0.0',
            info: { title: 'Satelink API', version: '1.0.0', description: 'DePIN protocol API for nodes, builders, and distributors' },
            servers: [{ url: '/api', description: 'Satelink backend' }],
            tags: [
                { name: 'Node', description: 'Node operator endpoints' },
                { name: 'Builder', description: 'Builder / API key endpoints' },
                { name: 'Distributor', description: 'Distributor referral endpoints' },
                { name: 'Admin', description: 'Admin management endpoints' },
                { name: 'Health', description: 'Service health' },
            ],
            paths: {
                '/health': { get: { tags: ['Health'], summary: 'Service health', responses: { 200: { description: 'ok' } } } },
                '/node-api/stats': { get: { tags: ['Node'], summary: 'Node stats', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/node-api/earnings': { get: { tags: ['Node'], summary: 'Epoch earnings history', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/node-api/claim': { post: { tags: ['Node'], summary: 'Claim unpaid rewards', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { signature: { type: 'string' } }, required: ['signature'] } } } }, responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/builder-api/keys': { get: { tags: ['Builder'], summary: 'List API keys', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/builder-api/projects': { get: { tags: ['Builder'], summary: 'List projects', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/dist-api/referrals': { get: { tags: ['Distributor'], summary: 'Referral list', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/dist-api/history': { get: { tags: ['Distributor'], summary: 'Earnings history chart', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/dist-api/conversions': { get: { tags: ['Distributor'], summary: 'Recent acquisitions', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/admin-api/stats': { get: { tags: ['Admin'], summary: 'Admin dashboard stats', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/admin-api/withdrawals': { get: { tags: ['Admin'], summary: 'List withdrawals', security: [{ bearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/admin-api/rewards/summary': { get: { tags: ['Admin'], summary: 'Rewards summary', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/admin-api/settings': { get: { tags: ['Admin'], summary: 'Feature flags & rate limits', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
                '/ledger/withdraw': { post: { tags: ['Node'], summary: 'Submit withdrawal request', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } } } },
            },
            components: {
                securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // 13. DEV/TEST ROUTES
    // ═══════════════════════════════════════════════════════════
    safeMountRouter(app, '/__test/auth', () => createDevAuthRouter(opsEngine), 'dev_auth');
    safeMountRouter(app, '/__test/seed', () => createDevSeedRouter(opsEngine), 'dev_seed');
}
