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

    // ── Debug: Manual Epoch Aggregation Trigger ──
    // Triggers closeEpoch for the current OPEN epoch, then opens a new one.
    // Safe: only closes the current epoch, does not affect production auto-scheduling.
    app.get('/debug/run-epoch', async (req, res) => {
        try {
            // Find the current open epoch
            const openEpoch = db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
            if (!openEpoch) {
                return res.status(404).json({ ok: false, error: 'No OPEN epoch found' });
            }

            const epochId = openEpoch.id;
            console.log(`[Debug] Triggering epoch aggregation for epoch ${epochId}`);

            // Snapshot pre-state
            const preRevenue = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount_usdt),0) as total FROM revenue_events_v2 WHERE epoch_id = ?").get(epochId);
            const preOps = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(ops),0) as total FROM op_counts WHERE epoch_id = ?").get(epochId);
            console.log(`[Debug] Pre-close: revenue_events_v2=${preRevenue.cnt} (${preRevenue.total} USDT), op_counts=${preOps.cnt} (${preOps.total} ops)`);

            // Close the epoch
            const result = closeEpoch(db, epochId);

            // Verify post-state
            const postEarnings = db.prepare("SELECT COUNT(*) as cnt FROM node_epoch_earnings WHERE epoch_id = ?").get(epochId);
            const postEpochEarnings = db.prepare("SELECT COUNT(*) as cnt FROM epoch_earnings WHERE epoch_id = ?").get(epochId);
            const balanceSample = db.prepare("SELECT * FROM balances ORDER BY amount_usdt DESC LIMIT 5").all();

            // Create a new OPEN epoch so future requests continue working
            const now = Math.floor(Date.now() / 1000);
            db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run(now);
            const newEpoch = db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();

            console.log(`[Debug] Epoch ${epochId} closed. New epoch: ${newEpoch?.id}`);

            res.status(200).json({
                ok: true,
                closed_epoch: result,
                verification: {
                    node_epoch_earnings_count: postEarnings.cnt,
                    epoch_earnings_count: postEpochEarnings.cnt,
                    top_balances: balanceSample
                },
                new_epoch_id: newEpoch?.id
            });
        } catch (error) {
            console.error('[Debug] Epoch aggregation failed:', error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // ── Debug: Pipeline Status ──
    app.get('/debug/pipeline-status', (req, res) => {
        try {
            const epochs = db.prepare("SELECT * FROM epochs ORDER BY id DESC LIMIT 5").all();
            const revenueCount = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount_usdt),0) as total FROM revenue_events_v2").get();
            const opCounts = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(ops),0) as total FROM op_counts").get();
            const execMetrics = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(requests_handled),0) as total FROM execution_metrics").get();
            const nodeEarnings = db.prepare("SELECT COUNT(*) as cnt FROM node_epoch_earnings").get();
            const epochEarnings = db.prepare("SELECT COUNT(*) as cnt FROM epoch_earnings").get();
            const balances = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount_usdt),0) as total FROM balances").get();

            res.status(200).json({
                ok: true,
                pipeline: {
                    epochs,
                    revenue_events_v2: revenueCount,
                    op_counts: opCounts,
                    execution_metrics: execMetrics,
                    node_epoch_earnings: nodeEarnings,
                    epoch_earnings: epochEarnings,
                    balances
                }
            });
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // Catch-all
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });
}
