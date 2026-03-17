import { createUserSettingsRouter } from './routes/user_settings.js';
import { createUnifiedAuthRouter } from './routes/auth_v2.js';
import { createAuthController } from '../auth/auth_controller.js';
import { createStreamApiRouter } from './routes/stream_api.js';
import { createPhase3Router } from './routes/api_phase3.js';
import { createEnterpriseRouter, createDemandMetricsRouter } from './routes/api_enterprise.js';
import { createBillingMiddleware } from '../security/middleware/billing.js';
import { requireJWT, requireRole } from '../security/auth_middleware.js';
import { closeEpoch } from '../economics/epoch_aggregator.js';
import { getAggregatedNodeEarnings } from '../economics/node_earnings.js';
import { getNetworkStats } from '../monitoring/network_stats.js';
import { getEconomicsSummary } from '../economics/economics_stats.js';
import { createRpcRouter } from './routes/rpc.js';
import { createFuturesRouter } from './routes/futures_api.js';
import { createOpsRouter } from './routes/ops_api.js';
import { createNodeNetworkRouter } from './routes/node_network.js';
import { createDemandRouter } from './routes/demand_api.js';
import { createRpcGateway } from '../workloads/rpc_gateway/rpc_gateway.js';
import { createWebhookRouter } from '../workloads/webhook_delivery/webhook_worker.js';
import { AutomationScheduler, createAutomationRouter } from '../workloads/automation_jobs/automation_scheduler.js';
import { WorkloadMetrics } from '../workloads/workload_metrics.js';
import { createGrowthRouter } from './routes/growth_api.js';
import { createGatewayLayer } from './routes/gateway_api.js';
import { createWorkloadAdminRouter } from './routes/admin_workloads.js';
import { WorkloadAcquisitionEngine } from '../workloads/workload_acquisition_engine.js';
import { DemandBuffer } from '../queue/demand_buffer.js';
import { createCompatibilityGatewayRoutes } from './routes/compatibility_gateway_api.js';
import { GenesisWorkloadEngine } from '../genesis-nodes/genesis_workload_engine.js';
import { createGenesisAdminRouter } from './routes/admin_genesis.js';
import { DemandFlywheelEngine } from '../scheduler/demand_flywheel_engine.js';
import { createFlywheelAdminRouter } from './routes/admin_flywheel.js';
import { AbuseFirewall } from '../security/abuse_firewall.js';
import client from 'prom-client';
import { JobQueue } from '../queue/job_queue.js';
import { JobProducer } from '../queue/job_producer.js';
import { createAiRouter } from './routes/ai_api.js';
import { createJobSubmitRouter } from './routes/job_submit.js';
import { NodeCapacityManager } from '../queue/node_capacity_manager.js';
import { QueueBackpressure } from '../queue/queue_backpressure.js';

// ── Previously Unmounted Route Modules ──
import { createAdminControlRoomRouter } from './routes/admin_control_room_api.js';
import { createEmbeddedAuthRouter } from './routes/auth_embedded.js';
import { createBuilderAuthRouter } from './routes/builder_auth.js';
import { createBuilderApiRouter } from './routes/builder_api.js';
import { createNodeApiRouter } from './routes/node_api_v2.js';
import { createAdminRevenueRouter } from './routes/admin_revenue.js';
import { createAdminReputationRouter } from './routes/admin_reputation.js';
import { createAdminLifecycleRouter } from './routes/admin_lifecycle.js';
import { createAdminNetworkRouter } from './routes/admin_network.js';
import { createAdminPartnersRouter } from './routes/admin_partners.js';
import { createAdminLaunchRouter } from './routes/admin_launch.js';
import { createPublicMarketplaceRouter } from './routes/public_marketplace.js';
import { createPublicNodeRouter } from './routes/public_node.js';
import { createPublicStatusRouter } from './routes/public_status.js';
import { createNodeLifecycleRouter } from './routes/node_lifecycle.js';
import { createPairApiRouter } from './routes/pair_api.js';
import { createSupportRouter } from './routes/support.js';
import { createLedgerRouter } from './routes/ledger.js';
import { OperationsEngine } from '../core/operations_engine.js';

// ── Additional Route Modules (Phase 14 wiring) ──
import { createDevAuthRouter } from './routes/dev_auth_tokens.js';
import { createBetaRouter } from './routes/beta_api.js';
import { createAdminEconomicsRouter } from './routes/admin_economics.js';
import { createAdminForensicsRouter } from './routes/admin_forensics.js';
import { createAdminGrowthRouter } from './routes/admin_growth.js';
import { createAdminSLARouter } from './routes/admin_sla.js';
import { createDistApiRouter } from './routes/dist_api_v2.js';
import { createEntApiRouter } from './routes/ent_api_v2.js';
import { createPublicPartnersRouter } from './routes/public_partners.js';
import { createAdminAutonomousRouter } from './routes/admin_autonomous.js';

client.collectDefaultMetrics();

export function attachRoutes(app, db, { jobEscrow, futuresEscrow, opsAdapter } = {}) {
    const requireAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])];
    const requireEnterprise = [requireJWT, requireRole('enterprise')];
    const requireNode = [requireJWT, requireRole('node_operator')];

    // ── Operations Engine (needed by ledger, control room, etc.) ──
    const opsEngine = new OperationsEngine(db, null, null);
    opsEngine.init().catch(e => console.warn('[OpsEngine] Init deferred:', e.message));

    // ── Global Gateway Layer ──
    const { middleware: gwMiddleware, router: gwRouter } = createGatewayLayer(db, {});
    app.use(gwMiddleware);
    app.use('/v1/gateway', gwRouter);

    // ── Health & Metrics ──
    app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime(), db: "connected" }));
    app.get("/metrics", async (req, res) => {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    });
    // JSON metrics endpoint for dashboard polling
    app.get("/metrics/json", async (req, res) => {
        try {
            const metrics = await client.register.getMetricsAsJSON();
            res.json({ ok: true, metrics });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── Network health (used by dashboard useNetworkHealth hook) ──
    app.get("/api/network/health", async (req, res) => {
        try {
            const online = db.prepare?.("SELECT COUNT(*) as c FROM registered_nodes WHERE active = 1")?.get()?.c || 0;
            const jailed = db.prepare?.("SELECT COUNT(*) as c FROM registered_nodes WHERE is_flagged = 1")?.get()?.c || 0;
            const total = db.prepare?.("SELECT COUNT(*) as c FROM registered_nodes")?.get()?.c || 0;
            res.json({ ok: true, data: { status: 'healthy', nodeHealth: { online, jailed, slashed: 0, total }, alerts: 0 } });
        } catch (e) {
            res.json({ ok: true, data: { status: 'degraded', nodeHealth: { online: 0, jailed: 0, slashed: 0, total: 0 }, alerts: 0 } });
        }
    });

    // ── Network stats (alias for dashboard) ──
    app.get("/api/network/stats", async (req, res) => {
        try {
            const stats = getNetworkStats(db);
            res.json({ ok: true, ...stats });
        } catch (e) {
            res.json({ ok: true, nodes_online: 0, total_nodes: 0, uptime: process.uptime() });
        }
    });

    // ── New Distributed Job Queue Ingestion Layer ──
    app.use('/v1/jobs', createJobSubmitRouter(db));
    app.use('/v1/workload/rpc', createRpcGateway(db));
    app.use('/v1/webhook', createWebhookRouter(db));
    app.use('/v1/ai', createAiRouter(db));

    const buffer = new DemandBuffer();
    const acquisitionEngine = new WorkloadAcquisitionEngine(buffer);
    acquisitionEngine.start();

    // ── Genesis Workload Engine (autonomous workload discovery) ──
    const genesisEngine = new GenesisWorkloadEngine(buffer, {});
    try { genesisEngine.start(); } catch (e) { console.warn('[Genesis] Engine start deferred:', e.message); }

    // ── Demand Flywheel Engine (follow-up workload generation) ──
    const abuseFirewall = new AbuseFirewall(db);
    const flywheelEngine = new DemandFlywheelEngine(buffer, abuseFirewall, {});
    try { flywheelEngine.start(); } catch (e) { console.warn('[Flywheel] Engine start deferred:', e.message); }

    const autoScheduler = new AutomationScheduler(db);
    autoScheduler.start();
    app.use('/v1/automation', createAutomationRouter(autoScheduler));

    // ── Expansion Connectors Admin ──
    app.use('/api/admin/workloads', requireAdmin, createWorkloadAdminRouter(acquisitionEngine));
    app.use('/api/admin/genesis', requireAdmin, createGenesisAdminRouter(genesisEngine));
    app.use('/api/admin/flywheel', requireAdmin, createFlywheelAdminRouter(flywheelEngine));

    app.get('/health/queue', async (req, res) => {
        try {
            const length = await JobQueue.getLength();
            res.status(200).json({
                ok: true,
                queue_depth: length,
                pricing_multiplier: QueueBackpressure.getPricingMultiplier(length),
                status: length < 1000000 ? 'healthy' : 'throttled'
            });
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // ── Authentication Routes ──
    // Legacy auth router (auth_v2) — kept for /me, /auth/me, /login, /auth/register
    app.use(createUnifiedAuthRouter({ db }));

    // ── Unified Auth Controller (canonical pipeline) ──
    // Handles: /auth/challenge, /auth/verify, /auth/me, /auth/refresh, /auth/logout
    // Backward-compatible aliases: /auth/nonce, /auth/start, /auth/finish
    app.use('/auth', createAuthController(db));

    // Legacy embedded auth — preserved at /auth/embedded for clients not yet migrated
    app.use('/auth/embedded', createEmbeddedAuthRouter(db));

    // Builder auth — separate session domain (HMAC cookie + JWT)
    app.use(createBuilderAuthRouter(opsEngine));

    // Dev-only test auth (auto-disabled in production via internal guard)
    app.use('/__test/auth', createDevAuthRouter({ db }));

    // ── User & Settings ──
    app.use('/me', createUserSettingsRouter(db));
    app.use('/pair', createPairApiRouter({ db }));
    app.use('/support', requireJWT, createSupportRouter(db));

    // ── Node Operator Routes ──
    app.use('/v1/node', createNodeNetworkRouter(db, opsEngine));
    app.use('/node', requireJWT, createNodeApiRouter({ db }));
    app.use('/api/node', requireJWT, createNodeApiRouter({ db })); // Alias for frontend /api/node/* calls
    app.use('/v1/node/lifecycle', requireJWT, createNodeLifecycleRouter(db));

    // ── Builder / Developer Routes ──
    app.use('/builder-api', requireJWT, createBuilderApiRouter({ db }, requireJWT));
    app.use('/api/builder', requireJWT, createBuilderApiRouter({ db }, requireJWT)); // Alias for frontend /api/builder/* calls

    // ── Distributor & Enterprise Routes ──
    app.use('/dist-api', requireJWT, createDistApiRouter({ db }));
    app.use('/ent-api', requireEnterprise, createEntApiRouter({ db }));

    // ── Public Routes (no auth required) ──
    app.use('/api/network', createPublicNodeRouter(db));
    app.use('/api/network/marketplace', createPublicMarketplaceRouter(db)); // Alias for frontend
    app.use('/api/marketplace', createPublicMarketplaceRouter(db));
    app.use('/api/status', createPublicStatusRouter(db));
    app.use('/api/partners', createPublicPartnersRouter(db));

    // ── Economics summary (used by RevenueSplitChart) ──
    app.get('/api/economics/summary', async (req, res) => {
        try {
            const summary = getEconomicsSummary(db);
            res.json({ ok: true, ...summary });
        } catch (e) {
            res.json({ ok: true, total_revenue: 0, node_share: 0, platform_share: 0, distribution_share: 0 });
        }
    });

    // ── Settlement mode (used by useSettlementMode hook) ──
    app.get('/settlement/mode', (req, res) => {
        const mode = process.env.FEATURE_REAL_SETTLEMENT === 'true' ? 'live' : 'simulated';
        res.json({ ok: true, mode, adapter: mode === 'live' ? 'evm' : 'simulated' });
    });

    // ── Growth & Revenue ──
    app.use('/v1', createGrowthRouter(db).router);
    app.use('/stream', createStreamApiRouter({ db }));

    if (futuresEscrow) app.use('/v1/futures', createFuturesRouter(db, futuresEscrow));
    if (opsAdapter) app.use('/v1/ops', createOpsRouter(db, opsAdapter));

    // ── RPC ──
    app.use("/rpc", createRpcRouter(db));

    // ── Beta Program (no admin required) ──
    app.use('/beta', createBetaRouter({ db }));
    app.use('/api/demand', requireAdmin, createDemandMetricsRouter(db));

    // ── Admin Sub-Routers (mounted before control room for path priority) ──
    app.use('/api/admin/revenue', requireAdmin, createAdminRevenueRouter(db));
    app.use('/api/admin/reputation', requireAdmin, createAdminReputationRouter(db));
    app.use('/api/admin/lifecycle', requireAdmin, createAdminLifecycleRouter(db));
    app.use('/api/admin/network', requireAdmin, createAdminNetworkRouter(db));
    // Aliases: frontend calls /api/admin/network/reputation and /api/admin/network/releases
    app.use('/api/admin/network/reputation', requireAdmin, createAdminReputationRouter(db));
    app.use('/api/admin/network', requireAdmin, createAdminLifecycleRouter(db));
    app.use('/api/admin/partners', requireAdmin, createAdminPartnersRouter(db));
    app.use('/api/admin/launch', requireAdmin, createAdminLaunchRouter(db));
    app.use('/api/admin/ledger', requireAdmin, createLedgerRouter(opsEngine, (req, res, next) => next()));
    // Ledger execute endpoint (used by workload generator and admin dashboard)
    app.post('/api/admin/ledger/execute', requireAdmin, async (req, res) => {
        try {
            const result = await opsEngine.executeOp(req.body);
            res.json(result);
        } catch (e) {
            res.status(e.message.includes('Rate limit') ? 429 : 500).json({ ok: false, error: e.message });
        }
    });
    // Ledger events endpoint (used by admin dashboard)
    app.get('/api/admin/ledger/events', requireAdmin, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const rows = db.prepare?.("SELECT * FROM revenue_events_v2 ORDER BY id DESC LIMIT ?")?.all(limit) || [];
            res.json({ ok: true, events: rows });
        } catch (e) {
            res.json({ ok: true, events: [] });
        }
    });
    app.use('/api/admin/economics', requireAdmin, createAdminEconomicsRouter(db, null, null, null));
    app.use('/api/admin/forensics', requireAdmin, createAdminForensicsRouter(db, {}));
    app.use('/api/admin/growth', requireAdmin, createAdminGrowthRouter(db, null));
    app.use('/api/admin/sla', requireAdmin, createAdminSLARouter(db, null));
    app.use('/api/admin/autonomous', requireAdmin, createAdminAutonomousRouter(db, null));

    // ── Admin Control Room (comprehensive admin — handles 72+ routes) ──
    const controlRoomRouter = createAdminControlRoomRouter(opsEngine, {});

    // Settlement path compatibility: frontend calls /api/admin/settlement/*
    // but control room defines routes at /services/settlement/*
    app.use('/api/admin/settlement', requireAdmin, (req, res, next) => {
        req.url = '/services/settlement' + req.url;
        controlRoomRouter(req, res, next);
    });

    // ── Admin convenience aliases ──
    // /api/admin/nodes → control room's /network/nodes
    app.get('/api/admin/nodes', requireAdmin, (req, res, next) => {
        req.url = '/network/nodes' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
        controlRoomRouter(req, res, next);
    });
    // /api/admin/workloads direct alias (already mounted as sub-router above, but
    // ensure the control room also handles /ops/* which includes workload-related routes)

    // Mount control room at /api/admin — catches all remaining admin paths
    app.use('/api/admin', requireAdmin, controlRoomRouter);

    // ── Legacy admin-api catch-all for dashboard compatibility ──
    // Forwards to control room for any /admin-api/* requests not handled above
    app.use('/admin-api', requireAdmin, (req, res, next) => {
        controlRoomRouter(req, res, next);
    });

    // ── /admin/* mirror for scripts & backward compatibility ──
    // All admin endpoints accessible at BOTH /api/admin/* AND /admin/*
    app.use('/admin/settlement', requireAdmin, (req, res, next) => {
        req.url = '/services/settlement' + req.url;
        controlRoomRouter(req, res, next);
    });
    app.use('/admin/revenue', requireAdmin, createAdminRevenueRouter(db));
    app.use('/admin/reputation', requireAdmin, createAdminReputationRouter(db));
    app.use('/admin/lifecycle', requireAdmin, createAdminLifecycleRouter(db));
    app.use('/admin/network/reputation', requireAdmin, createAdminReputationRouter(db));
    app.use('/admin/network', requireAdmin, createAdminNetworkRouter(db));
    app.use('/admin/partners', requireAdmin, createAdminPartnersRouter(db));
    app.use('/admin/launch', requireAdmin, createAdminLaunchRouter(db));
    app.use('/admin/ledger', requireAdmin, createLedgerRouter(opsEngine, (req, res, next) => next()));
    app.post('/admin/ledger/execute', requireAdmin, async (req, res) => {
        try {
            const result = await opsEngine.executeOp(req.body);
            res.json(result);
        } catch (e) {
            res.status(e.message.includes('Rate limit') ? 429 : 500).json({ ok: false, error: e.message });
        }
    });
    app.get('/admin/ledger/events', requireAdmin, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const rows = db.prepare?.("SELECT * FROM revenue_events_v2 ORDER BY id DESC LIMIT ?")?.all(limit) || [];
            res.json({ ok: true, events: rows });
        } catch (e) {
            res.json({ ok: true, events: [] });
        }
    });
    app.use('/admin/economics', requireAdmin, createAdminEconomicsRouter(db, null, null, null));
    app.use('/admin/forensics', requireAdmin, createAdminForensicsRouter(db, {}));
    app.use('/admin/growth', requireAdmin, createAdminGrowthRouter(db, null));
    app.use('/admin/sla', requireAdmin, createAdminSLARouter(db, null));
    app.use('/admin/autonomous', requireAdmin, createAdminAutonomousRouter(db, null));
    app.use('/admin/workloads', requireAdmin, createWorkloadAdminRouter(acquisitionEngine));
    app.use('/admin/genesis', requireAdmin, createGenesisAdminRouter(genesisEngine));
    app.use('/admin/flywheel', requireAdmin, createFlywheelAdminRouter(flywheelEngine));
    app.get('/admin/nodes', requireAdmin, (req, res, next) => {
        req.url = '/network/nodes' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
        controlRoomRouter(req, res, next);
    });
    app.use('/admin', requireAdmin, controlRoomRouter);

    // Catch-all
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });
}
