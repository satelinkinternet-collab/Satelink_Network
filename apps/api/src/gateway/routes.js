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
import { connection as redis } from '../queue/redisClient.js';

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

    // ── System Health (powers dashboard UI) ──
    app.get('/system/status', async (req, res) => {
        try {
            const currentEpoch = await db.prepare("SELECT id, status, starts_at FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
            const lastClosed = await db.prepare("SELECT id, ends_at, total_revenue_usdt FROM epochs WHERE status = 'FINALIZED' ORDER BY ends_at DESC LIMIT 1").get();
            const totalRevenue = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2").get();
            const totalBalances = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total, COUNT(*) as wallets FROM balances").get();
            const totalEarnings = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings").get();
            const epochCount = await db.prepare("SELECT COUNT(*) as total FROM epochs WHERE status = 'FINALIZED'").get();

            // Live metrics for dashboard graphs
            const now = Math.floor(Date.now() / 1000);
            const oneMinAgo = now - 60;
            const fiveMinAgo = now - 300;
            const oneHourAgo = now - 3600;

            const opsLastMin = await db.prepare("SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at >= ?").get(oneMinAgo);
            const revLast5Min = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE created_at >= ?").get(fiveMinAgo);
            const epochsLastHour = await db.prepare("SELECT COUNT(*) as count FROM epochs WHERE status = 'FINALIZED' AND ends_at >= ?").get(oneHourAgo);

            res.json({
                ok: true,
                epoch_id: currentEpoch?.id ?? null,
                epoch_status: currentEpoch?.status ?? 'NONE',
                epoch_started_at: currentEpoch?.starts_at ?? null,
                total_revenue: totalRevenue.total,
                total_earnings: totalEarnings.total,
                total_balances: totalBalances.total,
                active_wallets: totalBalances.wallets,
                epochs_finalized: epochCount.total,
                last_epoch_close_time: lastClosed?.ends_at ?? null,
                last_epoch_revenue: lastClosed?.total_revenue_usdt ?? 0,
                ops_per_min: opsLastMin.count,
                revenue_last_5min: { count: revLast5Min.count, total_usdt: revLast5Min.total },
                epochs_last_hour: epochsLastHour.count,
                scheduler_active: true,
                scheduler_last_run_time: schedulerStatus.last_run_time,
                scheduler_last_status: schedulerStatus.last_status,
                scheduler_last_error: schedulerStatus.last_error
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── Debug / Pipeline Routes ──
    const opsEngine = new OperationsEngine(db, null, null);

    app.get('/debug/pipeline-status', async (req, res) => {
        try {
            // Ensure tables exist (OperationsEngine seeds them)
            if (!opsEngine.initialized) await opsEngine.init();

            const revenue_v2 = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2").get();
            const exec_metrics = await db.prepare("SELECT COUNT(*) as count FROM execution_metrics").get();
            const op_counts_row = await db.prepare("SELECT COUNT(*) as count FROM op_counts").get();
            const earnings = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings").get();
            const balances_row = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM balances").get();
            const epochs_list = await db.prepare("SELECT id, status, starts_at, ends_at, total_revenue_usdt FROM epochs ORDER BY id DESC LIMIT 5").all();

            res.json({
                ok: true,
                pipeline: {
                    revenue_events_v2: { count: revenue_v2.count, total_usdt: revenue_v2.total },
                    execution_metrics: { count: exec_metrics.count },
                    op_counts: { count: op_counts_row.count },
                    epoch_earnings: { count: earnings.count, total_usdt: earnings.total },
                    balances: { count: balances_row.count, total_usdt: balances_row.total },
                    recent_epochs: epochs_list
                }
            });
        } catch (e) {
            console.error("[DEBUG] pipeline-status error:", e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.get('/debug/run-epoch', async (req, res) => {
        try {
            if (!opsEngine.initialized) await opsEngine.init();

            console.log("[DEBUG] Aggregation triggered");
            const now = Math.floor(Date.now() / 1000);

            // 1. Find or create an OPEN epoch
            let epoch = await db.prepare("SELECT id FROM epochs WHERE status = 'OPEN'").get();
            if (!epoch) {
                const r = await db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run(now);
                epoch = { id: r.lastInsertRowid };
                console.log("[DEBUG] Created new OPEN epoch:", epoch.id);
            }
            const epochId = epoch.id;

            // 2. Count revenue for this epoch
            const revCount = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2 WHERE epoch_id = ?").get(epochId);
            console.log(`[DEBUG] Revenue count: ${revCount.count}, total: ${revCount.total}`);

            if (revCount.count === 0) {
                return res.json({
                    ok: true,
                    warning: "No revenue events for current epoch",
                    epoch_id: epochId,
                    revenue_count: 0
                });
            }

            // 3. Check if already finalized (idempotency)
            const existingEarnings = await db.prepare("SELECT COUNT(*) as count FROM epoch_earnings WHERE epoch_id = ?").get(epochId);
            if (existingEarnings.count > 0) {
                const finalEarnings = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings WHERE epoch_id = ?").get(epochId);
                const finalBalances = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM balances").get();
                return res.json({
                    ok: true,
                    warning: "Epoch already finalized — no duplicate processing",
                    epoch_id: epochId,
                    earnings: { count: finalEarnings.count, total_usdt: finalEarnings.total },
                    balances: { count: finalBalances.count, total_usdt: finalBalances.total }
                });
            }

            // 4. Aggregate: 50/30/20 split from revenue_events_v2
            const totalRevenue = revCount.total;
            const nodePool = totalRevenue * 0.50;
            const platformFee = totalRevenue * 0.30;
            const distroPool = totalRevenue * 0.20;

            // 5. Distribute node pool proportionally by node_id contribution
            const nodeContributions = await db.prepare(`
                SELECT node_id, COUNT(*) as ops, COALESCE(SUM(amount_usdt), 0) as revenue
                FROM revenue_events_v2
                WHERE epoch_id = ? AND node_id IS NOT NULL
                GROUP BY node_id
            `).all(epochId);

            const totalNodeRevenue = nodeContributions.reduce((s, n) => s + n.revenue, 0);

            // Use a transaction for atomicity
            const runAggregation = db.transaction(async () => {
                // Platform earnings
                await db.prepare("INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'platform', 'PLATFORM_TREASURY', ?, 'UNPAID', ?)").run(epochId, platformFee, now);

                // Distribution pool
                await db.prepare("INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'distribution_pool', 'DIST_POOL', ?, 'UNPAID', ?)").run(epochId, distroPool, now);

                // Node operator earnings (proportional to revenue contribution)
                for (const node of nodeContributions) {
                    const share = totalNodeRevenue > 0
                        ? (node.revenue / totalNodeRevenue) * nodePool
                        : 0;
                    if (share > 0) {
                        await db.prepare("INSERT OR IGNORE INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, status, created_at) VALUES (?, 'node_operator', ?, ?, 'UNPAID', ?)").run(epochId, node.node_id, share, now);
                    }
                }

                // Close epoch
                await db.prepare("UPDATE epochs SET status = 'FINALIZED', ends_at = ?, total_revenue_usdt = ?, node_pool_usdt = ?, platform_share_usdt = ?, distributor_share_usdt = ? WHERE id = ?").run(now, totalRevenue, nodePool, platformFee, distroPool, epochId);
            });

            await runAggregation();
            console.log("[DEBUG] Earnings written for epoch:", epochId);

            // 6. Update balances from node_operator earnings
            const earningsRows = await db.prepare("SELECT wallet_or_node_id, SUM(amount_usdt) as total FROM epoch_earnings WHERE epoch_id = ? AND role = 'node_operator' GROUP BY wallet_or_node_id").all(epochId);
            for (const row of earningsRows) {
                const existing = await db.prepare("SELECT 1 FROM balances WHERE wallet = ?").get(row.wallet_or_node_id);
                if (existing) {
                    await db.prepare("UPDATE balances SET amount_usdt = amount_usdt + ?, updated_at = ? WHERE wallet = ?").run(row.total, now, row.wallet_or_node_id);
                } else {
                    await db.prepare("INSERT INTO balances (wallet, amount_usdt, updated_at) VALUES (?, ?, ?)").run(row.wallet_or_node_id, row.total, now);
                }
            }
            console.log("[DEBUG] Balances updated for", earningsRows.length, "wallets");

            // 7. Open a new epoch for future revenue
            await db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run(now);

            // 8. Return results
            const finalEarnings = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings WHERE epoch_id = ?").get(epochId);
            const finalBalances = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM balances").get();

            res.json({
                ok: true,
                epoch_id: epochId,
                revenue: { count: revCount.count, total_usdt: totalRevenue },
                split: { node_pool: nodePool, platform: platformFee, distribution: distroPool },
                nodes_distributed: earningsRows.length,
                earnings: { count: finalEarnings.count, total_usdt: finalEarnings.total },
                balances: { count: finalBalances.count, total_usdt: finalBalances.total }
            });
        } catch (e) {
            console.error("[DEBUG] run-epoch error:", e.message, e.stack);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // ── Network Health & Stats (powers dashboard widgets) ──
    app.get('/network/health', (req, res) => {
        res.json({
            ok: true,
            data: {
                status: 'healthy',
                nodeHealth: { online: 0, jailed: 0, slashed: 0 },
                alerts: 0,
                snapshotUrl: ''
            }
        });
    });

    app.get('/api/network/stats', (req, res) => {
        try {
            const stats = getNetworkStats(db);
            res.json(stats);
        } catch (e) {
            res.json({
                totalNodes: 0,
                activeNodes: 0,
                currentEpoch: 0,
                totalRevenueUsdt: 0,
                totalOpsProcessed: 0,
                lastEpochClosedAt: null
            });
        }
    });

    app.get('/dev/seed-job', async (req, res) => {
        try {
            const jobId = `job_${Math.random().toString(36).substr(2, 9)}`;
            await redis.xadd(
                'satelink_jobs_normal',
                '*',
                'job_id', jobId,
                'job_type', 'compute_task_standard',
                'client_id', 'client_001',
                'payload', JSON.stringify({ value: Math.random() }),
                'reward_usdt', '0.005',
                'priority', 'NORMAL',
                'created_at', Date.now().toString()
            );
            res.json({ ok: true, message: "Job seeded", job_id: jobId });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Catch-all
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });
}
