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
import { OperationsEngine } from '../core/operations_engine.js';
import { schedulerStatus } from '../economics/epoch_scheduler.js';

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

    const buffer = new DemandBuffer();
    const acquisitionEngine = new WorkloadAcquisitionEngine(buffer);
    acquisitionEngine.start();

    const autoScheduler = new AutomationScheduler(db);
    autoScheduler.start();
    app.use('/v1/automation', createAutomationRouter(autoScheduler));

    app.use('/api/admin/workloads', requireAdmin, createWorkloadAdminRouter(acquisitionEngine));

    app.get('/health/queue', async (req, res) => {
        try { const length = await JobQueue.getLength(); res.status(200).json({ ok: true, queue_depth: length }); }
        catch (error) { res.status(500).json({ ok: false, error: error.message }); }
    });

    app.use("/rpc", createRpcRouter(db));
    app.use('/me', createUserSettingsRouter(db));
    app.use(createUnifiedAuthRouter({ db }));
    app.use('/v1/node', createNodeNetworkRouter(db));
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
