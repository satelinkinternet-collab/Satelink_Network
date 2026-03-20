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
import { OperationsEngine } from '../core/operations_engine.js';
import { schedulerStatus } from '../economics/epoch_scheduler.js';

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
import { createDashboardApiRouter } from '../dashboard_api/index.js';

client.collectDefaultMetrics();

let demoState = { active: null, expiry: 0 };

export function attachRoutes(app, db, { jobEscrow, futuresEscrow, opsAdapter } = {}) {
    const requireAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])];

    app.post('/demo/traffic-spike', (req, res) => { demoState = { active: 'spike', expiry: Date.now() + 60000 }; res.json({ ok: true }); });
    app.post('/demo/failure', (req, res) => { demoState = { active: 'failure', expiry: Date.now() + 60000 }; res.json({ ok: true }); });
    app.post('/demo/revenue-drop', (req, res) => { demoState = { active: 'drop', expiry: Date.now() + 60000 }; res.json({ ok: true }); });
    app.post('/demo/reset', (req, res) => { demoState = { active: null, expiry: 0 }; res.json({ ok: true }); });

    const { middleware: gwMiddleware, router: gwRouter } = createGatewayLayer(db, {});
    app.use(gwMiddleware);
    app.use('/v1/gateway', gwRouter);

    app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime(), db: "connected" }));
    app.get("/metrics", async (req, res) => { res.set('Content-Type', client.register.contentType); res.end(await client.register.metrics()); });

    app.use('/v1/jobs', createJobSubmitRouter(db));
    app.use('/v1/workload/rpc', createRpcGateway(db));
    app.use('/v1/webhook', createWebhookRouter(db));
    app.use('/v1/ai', createAiRouter(db));

    // ── Demand Layer (submit → buffer → router → pipeline) ──
    const demandPipeline = { push_job: (job) => JobQueue.enqueue(job) };
    const { router: demandApiRouter, demandRouter: demandDrainLoop } = createDemandRouter(db, demandPipeline);
    app.use('/v1/demand', demandApiRouter);
    demandDrainLoop.start();

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

    app.use('/api/admin/workloads', requireAdmin, createWorkloadAdminRouter(acquisitionEngine));
    app.use('/api/admin/genesis', requireAdmin, createGenesisAdminRouter(genesisEngine));
    app.use('/api/admin/flywheel', requireAdmin, createFlywheelAdminRouter(flywheelEngine));

    app.get('/health/queue', async (req, res) => {
        try { const length = await JobQueue.getLength(); res.status(200).json({ ok: true, queue_depth: length }); }
        catch (error) { res.status(500).json({ ok: false, error: error.message }); }
    });

    app.use("/rpc", createRpcRouter(db));
    app.use('/me', createUserSettingsRouter(db));
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

    // ── Dashboard Query Layer (read-only, separated from operational APIs) ──
    app.use('/dashboard-api', createDashboardApiRouter(db));

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

    app.get('/system/status', async (req, res) => {
        try {
            const totalRevenue = await db.get("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2");
            const totalBalances = await db.get("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM balances");
            res.json({ ok: true, total_revenue: Number(totalRevenue?.total || 0), total_balances: Number(totalBalances?.total || 0) });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    const opsEngine = new OperationsEngine(db, null, null);

    app.get('/debug/run-epoch', async (req, res) => {
        try {
            const now = Math.floor(Date.now() / 1000);
            let targetEpochId = req.query.epoch_id;
            
            if (!targetEpochId) {
                let epoch = await db.get("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1");
                if (!epoch) {
                    const r = await db.query("INSERT INTO epochs (starts_at, status) VALUES ($1, 'OPEN') RETURNING id", [now]);
                    epoch = { id: r[0].id };
                }
                targetEpochId = epoch.id;
            }
            const epochId = parseInt(targetEpochId);

            const revCount = await db.get("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE epoch_id = $1", [epochId]);
            if (Number(revCount.count) === 0) return res.json({ ok: true, warning: "No revenue", epoch_id: epochId });

            const nodePool = Number(revCount.total) * 0.50;
            const platformFee = Number(revCount.total) * 0.30;
            const distroPool = Number(revCount.total) * 0.20;

            const nodeContributions = await db.query(`SELECT node_id, SUM(amount_usdt) as revenue FROM revenue_events_v2 WHERE epoch_id = $1 AND node_id IS NOT NULL GROUP BY node_id`, [epochId]);
            const totalNodeRevenue = nodeContributions.reduce((s, n) => s + Number(n.revenue), 0);

            const task = db.transaction(async () => {
                await db.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES ($1, 'platform', 'PLATFORM_TREASURY', $2, 'UNPAID', $3)", [epochId, platformFee, now]);
                await db.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES ($1, 'distribution_pool', 'DIST_POOL', $2, 'UNPAID', $3)", [epochId, distroPool, now]);
                for (const node of nodeContributions) {
                    const share = (Number(node.revenue) / totalNodeRevenue) * nodePool;
                    if (share > 0) await db.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES ($1, 'node_operator', $2, $3, 'UNPAID', $4)", [epochId, node.node_id, share, now]);
                }
                await db.query("UPDATE epochs SET status = 'FINALIZED', ends_at = $1, total_revenue_usdt = $2 WHERE id = $3", [now, revCount.total, epochId]);
                
                for (const node of nodeContributions) {
                    const share = (Number(node.revenue) / totalNodeRevenue) * nodePool;
                    await db.query(`INSERT INTO balances (wallet, amount_usdt, updated_at) VALUES ($1, $2, $3) ON CONFLICT (wallet) DO UPDATE SET amount_usdt = balances.amount_usdt + EXCLUDED.amount_usdt, updated_at = EXCLUDED.updated_at`, [node.node_id, share, now]);
                }
            });
            await task();

            res.json({ ok: true, epoch_id: epochId, revenue: revCount.total, nodes: nodeContributions.length });
        } catch (e) {
            console.error("run-epoch error:", e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.all('*catchall', (req, res) => res.status(404).json({ ok: false, error: "Not Found" }));
}
