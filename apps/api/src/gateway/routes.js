import { createUserSettingsRouter } from './routes/user_settings.js';
import { createUnifiedAuthRouter } from './routes/auth_v2.js';
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
import { createPublicMarketplaceRouter } from './routes/public_marketplace.js';

client.collectDefaultMetrics();

export function attachRoutes(app, db, { jobEscrow, futuresEscrow, opsAdapter } = {}) {
    const requireAdmin = [requireJWT, requireRole(['admin_super', 'admin_ops'])];
    const requireEnterprise = [requireJWT, requireRole('enterprise')];
    const requireNode = [requireJWT, requireRole('node_operator')];

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

    // ── New Distributed Job Queue Ingestion Layer ──
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

    const autoScheduler = new AutomationScheduler(db);
    autoScheduler.start();
    app.use('/v1/automation', createAutomationRouter(autoScheduler));

    // Expansion Connectors Admin
    app.use('/api/admin/workloads', requireAdmin, createWorkloadAdminRouter(acquisitionEngine));

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

    // ── Public Marketplace ──
    app.use('/network/marketplace', createPublicMarketplaceRouter(db));

    // ── Legacy / Marketplace Compatibility ──
    app.use("/rpc", createRpcRouter(db));
    app.use('/me', createUserSettingsRouter(db));
    app.use(createUnifiedAuthRouter({ db }));
    app.use('/v1/node', createNodeNetworkRouter(db));
    app.use('/v1', createGrowthRouter(db).router);
    app.use('/stream', createStreamApiRouter({ db }));

    if (futuresEscrow) app.use('/v1/futures', createFuturesRouter(db, futuresEscrow));
    if (opsAdapter) app.use('/v1/ops', createOpsRouter(db, opsAdapter));

    // Admin
    app.use('/api/demand', requireAdmin, createDemandMetricsRouter(db));
    app.all(/^\/admin-api(\/.*)?$/, requireAdmin, (req, res) => res.status(200).json({ ok: true }));

    // Catch-all
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });
}
