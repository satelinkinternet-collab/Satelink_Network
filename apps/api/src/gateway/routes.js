import { createWithdrawRouter } from "../routes/withdraw.js";
import { WithdrawService } from '../services/withdrawService.js';
let opsEngine;
import { createControlRouter } from "./routes/control_routes.js";
import jwt from 'jsonwebtoken';
import { createUserSettingsRouter } from './routes/user_settings.js';
import { createUnifiedAuthRouter } from './routes/auth_v2.js';
import { createStreamApiRouter } from './routes/stream_api.js';
import { createPhase3Router } from './routes/api_phase3.js';
import { createEnterpriseRouter, createDemandMetricsRouter } from './routes/api_enterprise.js';
import { createBillingMiddleware } from '../security/middleware/billing.js';
import { requireJWT, requireRole, ADMIN_ROLES } from '../security/auth_middleware.js';
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
import { SettlementEngine } from '../settlement/settlement_engine.js';
import { AdapterRegistry } from '../settlement/adapter_registry.js';
import { SimulatedAdapter } from '../settlement/adapters/SimulatedAdapter.js';
import { EvmAdapter } from '../settlement/adapters/EvmAdapter.js';
import { connection as redis } from '../queue/redisClient.js';
import { createAdminControlRoomRouter } from './routes/admin_control_room_api.js';
import { createAdminApiRouter } from './routes/admin_api_v2.js';
import { createNodeApiRouter } from './routes/node_api_v2.js';
import { createBuilderApiV2Router } from './routes/builder_api_v2.js';
import { createDistApiRouter } from './routes/dist_api_v2.js';
import { createEntApiRouter } from './routes/ent_api_v2.js';
import { createDevAuthRouter } from './routes/dev_auth_tokens.js';
import { createIntegrationRouter } from '../integrations/router.js';

client.collectDefaultMetrics();

export function attachRoutes(app, db, { jobEscrow, futuresEscrow, opsAdapter } = {}) {
    const requireAdmin = [requireJWT, requireRole(ADMIN_ROLES)];
    const requireEnterprise = [requireJWT, requireRole(['enterprise'])];
    const requireNode = [requireJWT, requireRole(['node_operator'])];

    // ── Global Gateway Layer ──
    const { middleware: gwMiddleware, router: gwRouter } = createGatewayLayer(db, {});
    app.use(gwMiddleware);

    // ── Dev token (non-production ONLY) — includes wallet for requireJWT compat ──
    if (process.env.NODE_ENV !== 'production') {
        app.get("/dev/token", (req, res) => {
            const token = jwt.sign({
                user_id: "dev_admin",
                wallet: "0xDevAdmin",
                role: "admin_super"
            }, process.env.JWT_SECRET, { expiresIn: "7d" });
            res.json({ token });
        });

        // Dev auth router — exposes /__test/auth/{admin,node,builder}/login
        // for smoke scripts and local E2E. Router has its own NODE_ENV guard
        // (dev_auth_tokens.js:10-14) as defence-in-depth.
        app.use('/__test/auth', createDevAuthRouter(opsEngine));
    }

    app.use('/v1/gateway', gwRouter);

    // ── Health & Metrics ──
    app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime(), db: "connected" }));
    app.get("/metrics", async (req, res) => {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    });
 
    // Debug routes — non-production only, admin-authed
    if (process.env.NODE_ENV !== 'production') {
        app.get("/debug/db-check", ...requireAdmin, async (req, res) => {
            try {
                const result = await db.prepare("SELECT NOW() as now").get();
                res.json({ ok: true, now: result.now, adapter: "PgDatabase" });
            } catch (e) {
                res.status(500).json({ ok: false, error: e.message });
            }
        });
    }

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
  app.use("/v1", createControlRouter(opsEngine));
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

    // NOTE: /v1/ops is mounted after opsEngine init below (line ~215)
    // to guarantee a valid adapter is available.
    if (opsAdapter) app.use('/v1/ops', createOpsRouter(db, opsAdapter));


    // Admin
    app.use('/api/demand', createDemandMetricsRouter(db));

    // admin-api catch-all REMOVED — real routers mounted below after opsEngine init

    // ── System Health (powers dashboard UI) ──
    app.get('/system/status', async (req, res) => {
        try {
            const currentEpoch = await db.prepare("SELECT id, status, starts_at FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
            const lastClosed = await db.prepare("SELECT id, ends_at, total_revenue_usdt FROM epochs WHERE status = 'FINALIZED' ORDER BY ends_at DESC LIMIT 1").get();
            
            // Revenue from revenue_events_v2 (populated by OpsEngine, the actual execution path)
            const totalRevenue = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM revenue_events_v2").get();

            const totalBalances = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total, COUNT(*) as wallets FROM balances").get();
            const totalEarnings = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings").get();
            const epochCount = await db.prepare("SELECT COUNT(*) as total FROM epochs WHERE status = 'FINALIZED'").get();
            // Live metrics for dashboard graphs — Adjusted for timestamp mismatch (ms to s)
            const nowSec = Math.floor(Date.now() / 1000);
            const oneMinAgo = nowSec - 60;
            const fiveMinAgo = nowSec - 300;

            // created_at is already epoch SECONDS (stored via Math.floor(Date.now()/1000) in OpsEngine)
            const opsLastMin = await db.prepare("SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at >= ?").get(oneMinAgo);
            const opsLast5Min = await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total_usdt FROM revenue_events_v2 WHERE created_at >= ?").get(fiveMinAgo);
            console.log("[system/status] ops_last_min:", opsLastMin?.count, "ops_last_5min:", opsLast5Min?.count, "rev_5min:", opsLast5Min?.total_usdt);
            
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
                revenue_last_5min: { 
                    count: opsLast5Min.count, 
                    total_usdt: opsLast5Min.total_usdt 
                },
                epochs_last_hour: 0, // Placeholder
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
    global.opsEngine = new OperationsEngine(db, null, null);
    opsEngine = global.opsEngine;

    // ── Settlement Engine Setup ──
    const adapterRegistry = new AdapterRegistry();
    adapterRegistry.register(new SimulatedAdapter());
    const evmAdapter = new EvmAdapter(db);
    adapterRegistry.register(evmAdapter);
    console.log(`[BOOT] EvmAdapter registered: name=${evmAdapter.getName()}, enabled=${evmAdapter.enabled}`);
    const settlementEngine = new SettlementEngine(db, null, adapterRegistry, {});
    app.set('db', db);
    app.set('settlementEngine', settlementEngine);

    // ── Withdraw API (API-key + JWT secured) ──
    const withdrawService = new WithdrawService(db, evmAdapter);
    app.use('/api', createWithdrawRouter(withdrawService));
    console.log('[BOOT] WITHDRAW ROUTE REGISTERED at /api/withdraw');

    // ── /v1/ops fallback: mount with default adapter if not already mounted ──
    if (!opsAdapter) {
        const defaultOpsAdapter = {
            async dispatchOperation(op) {
                // Lazy-init opsEngine on first real request
                if (!global.opsEngine.initialized) await global.opsEngine.init();
                // Route through the existing opsEngine pipeline
                await global.opsEngine.executeOp({
                    op_type: op.type,
                    node_id: op.target,
                    client_id: op.client_id,
                    request_id: op.id,
                    timestamp: Math.floor(Date.now() / 1000),
                    payload_hash: `hash_${op.id}`,
                });
            }
        };
        app.use('/v1/ops', createOpsRouter(db, defaultOpsAdapter));
    }

    // ── Full Flow Test: API → executeOp → revenue → settlement (must be before /admin catch-all) ──
    app.post('/admin/debug/full-flow-test', ...requireAdmin, async (req, res) => {
        const results = { rpc: null, revenue: null, settlement: null };
        try {
            // 1. Execute a test op via opsEngine
            if (!global.opsEngine.initialized) await global.opsEngine.init();

            const requestId = `test_${Date.now()}`;
            await global.opsEngine.executeOp({
                op_type: 'rpc_call',
                node_id: 'debug_test_node',
                client_id: 'debug_flow_test',
                request_id: requestId,
                timestamp: Math.floor(Date.now() / 1000),
                payload_hash: `hash_${requestId}`,
            });
            results.rpc = 'success';

            // 2. Verify revenue event was created
            const row = await db.prepare(
                "SELECT id, op_type, amount_usdt, node_id, status FROM revenue_events_v2 WHERE request_id = ?"
            ).get(requestId);
            results.revenue = row ? { created: true, id: row.id, amount: row.amount_usdt } : { created: false };

            // 3. Create a payout batch from the revenue event (bridges the gap)
            try {
                const engine = app.get('settlementEngine');
                if (!engine) {
                    results.settlement = 'engine_not_available';
                } else {
                    const revenueRow = row || await db.prepare(
                        "SELECT id, amount_usdt, node_id FROM revenue_events_v2 WHERE request_id = ?"
                    ).get(requestId);

                    if (!revenueRow) {
                        results.settlement = 'no_revenue_event_to_settle';
                    } else {
                        const now = Date.now();
                        const nativeCurrency = process.env.SETTLEMENT_EVM_NATIVE_SYMBOL || 'MATIC';
                        await db.prepare(`
                            INSERT INTO payout_batches_v2 (status, adapter_type, currency, total_usdt, total_amount, meta_json, created_at, updated_at)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        `).run('queued', null, nativeCurrency, revenueRow.amount_usdt, revenueRow.amount_usdt, JSON.stringify({ source: 'full_flow_test', request_id: requestId }), now, now);

                        const batch = await db.prepare(
                            "SELECT id FROM payout_batches_v2 WHERE created_at = $1 AND meta_json LIKE $2 ORDER BY id DESC LIMIT 1"
                        ).get(now, `%${requestId}%`);

                        if (batch) {
                            const testWallet = '0x000000000000000000000000000000000000dEaD';
                            await db.prepare(`
                                INSERT INTO payout_items_v2 (batch_id, wallet, amount_usdt, status, created_at)
                                VALUES ($1, $2, $3, $4, $5)
                            `).run(batch.id, testWallet, revenueRow.amount_usdt, 'pending', now);

                            results.batch_created = { batch_id: batch.id, amount: revenueRow.amount_usdt };

                            const evmAdapterName = `EVM:${process.env.SETTLEMENT_EVM_CHAIN_NAME || 'polygon-amoy'}`;
                            await db.prepare(
                                "UPDATE system_flags SET value = $1, updated_at = $2 WHERE key = 'settlement_adapter'"
                            ).run(evmAdapterName, now);

                            await engine.processQueue();
                            results.settlement = 'processed';

                            const evmTx = await db.prepare(
                                "SELECT id, tx_hash, status, error_message FROM settlement_evm_txs WHERE batch_id = $1"
                            ).get(batch.id);
                            results.evm_tx = evmTx || 'no_evm_tx_created';
                        } else {
                            results.settlement = 'batch_insert_failed';
                        }
                    }
                }
            } catch (settleErr) {
                results.settlement = { error: settleErr.message };
            }

            res.json({ ok: true, ...results });
        } catch (e) {
            console.error('[FullFlowTest] Error:', e.message);
            res.status(500).json({ ok: false, error: e.message, partial_results: results });
        }
    });

    // ── Admin Control Room (legacy /admin/* mount, requires admin role) ──
    app.use('/admin', requireJWT, requireRole(ADMIN_ROLES), createAdminControlRoomRouter(opsEngine));


    // ── Role-Based Dashboard Routers (V2) — each has own JWT + role guards ──
    app.use('/admin-api', createAdminApiRouter(opsEngine));       // has own JWT + role guards

    app.use('/node-api', createNodeApiRouter(opsEngine));         // has own JWT + role guards

    app.use('/dist-api', createDistApiRouter(opsEngine));         // has own JWT + role guards

    app.use('/builder-api', requireJWT, createBuilderApiV2Router(opsEngine)); // builder routes (JWT enforced at mount)

    app.use('/ent-api', createEntApiRouter(opsEngine));           // has own JWT + role guards

    // ── Integrations / Ledger: /claim, /withdraw, /balances/:wallet, webhooks ──
    // Routes in integrations/router.js use absolute paths — mount at root.
    // Claim/withdraw handlers rely on signature verification inside opsEngine
    // (no JWT). Admin-protected subroutes use the passed middleware.
    app.use('/', createIntegrationRouter(opsEngine, requireAdmin));


    app.get('/debug/pipeline-status', ...requireAdmin, async (req, res) => {
        try {
            // Ensure tables exist (OperationsEngine seeds them)
            if (!global.opsEngine.initialized) await global.opsEngine.init();

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

    app.get('/debug/run-epoch', ...requireAdmin, async (req, res) => {
        try {
            if (!global.opsEngine.initialized) await global.opsEngine.init();

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
    app.get('/network/health', async (req, res) => {
        try {
            const nodes = await db.prepare(`
                SELECT
                    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as online,
                    SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as flagged
                FROM registered_nodes
            `).get() || { online: 0, flagged: 0 };

            const onlineCount = nodes.online || 0;
            res.json({
                ok: true,
                data: {
                    status: onlineCount > 0 ? 'healthy' : 'degraded',
                    nodeHealth: { online: onlineCount, jailed: nodes.flagged || 0, slashed: 0 },
                    alerts: 0,
                    snapshotUrl: ''
                }
            });
        } catch (e) {
            res.json({
                ok: true,
                data: { status: 'degraded', nodeHealth: { online: 0, jailed: 0, slashed: 0 }, alerts: 0, snapshotUrl: '' }
            });
        }
    });

    app.get('/api/network/stats', async (req, res) => {
        // Belt-and-suspenders: force no-cache on critical real-time endpoint
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        });
        try {
            const stats = await getNetworkStats(db);
            res.json(stats);
        } catch (e) {
            console.error("[STATS_API_FAILURE]", e.message);
            res.status(500).json({
                error: "database_unavailable"
            });
        }
    });

    // ── Economics Endpoints (powers RevenueSplitChart, useNodeEconomics) ──
    app.get('/api/economics/summary', async (req, res) => {
        try {
            const summary = await getEconomicsSummary(db);
            res.json(summary);
        } catch (e) {
            console.error('[ECONOMICS] summary error:', e.message);
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.get('/economics/node-pool/current', async (req, res) => {
        try {
            const stats = await getNetworkStats(db);
            const epochs = await db.prepare("SELECT COALESCE(SUM(node_pool_usdt), 0) as total FROM epochs WHERE status IN ('CLOSED', 'FINALIZED')").get();
            res.json({
                ok: true,
                data: {
                    totalRevenue: stats.totalRevenueUsdt,
                    nodePoolAllocation: parseFloat(epochs?.total || 0),
                    managedSplit: 60,
                    routerSplit: 40,
                    infraReservePct: 5,
                    minimumEarningsThreshold: 1.00,
                    claimWindowDays: 30,
                    cooldownHours: 24
                }
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.get('/economics/config', async (req, res) => {
        res.json({
            ok: true,
            data: {
                platformFeePct: 30,
                nodePoolPct: 50,
                infraReservePct: 5,
                distributorPct: 20
            }
        });
    });

    // Treasury status (powers /admin/treasury page)
    app.get('/treasury/status', async (req, res) => {
        try {
            const balances = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM balances").get();
            const earnings = await db.prepare("SELECT COALESCE(SUM(amount_usdt), 0) as total FROM epoch_earnings WHERE status = 'UNPAID'").get();
            res.json({
                ok: true,
                data: {
                    total_balance: parseFloat(balances?.total || 0),
                    unpaid_earnings: parseFloat(earnings?.total || 0),
                    settlement_mode: 'SIMULATED'
                }
            });
        } catch (e) {
            res.json({ ok: true, data: { total_balance: 0, unpaid_earnings: 0, settlement_mode: 'SIMULATED' } });
        }
    });

    // Partners CRUD (powers /admin/partners page)
    app.get('/api/admin/partners', requireAdmin, async (req, res) => {
        try {
            const partners = await db.prepare("SELECT * FROM partners ORDER BY created_at DESC LIMIT 50").all();
            res.json({ ok: true, data: partners });
        } catch (e) {
            res.json({ ok: true, data: [] });
        }
    });

    app.post('/api/admin/partners/register', requireAdmin, async (req, res) => {
        res.json({ ok: true, message: 'Partner registered (stub)' });
    });

    app.post('/api/admin/partners/:endpoint', requireAdmin, async (req, res) => {
        res.json({ ok: true, message: `Partner action ${req.params.endpoint} (stub)` });
    });

    app.get('/settlement/mode', async (req, res) => {
        try {
            const flag = await db.prepare("SELECT value FROM system_flags WHERE key = 'settlement_mode'").get();
            const mode = flag?.value || 'SIMULATED';
            res.json({
                ok: true,
                data: {
                    mode,
                    chainName: mode === 'EVM_LIVE' ? 'Fuse Network' : null,
                    contractAddress: null,
                    ledgerId: null
                }
            });
        } catch (e) {
            res.json({ ok: true, data: { mode: 'SIMULATED', chainName: null, contractAddress: null, ledgerId: null } });
        }
    });

    app.get('/dev/seed-job', ...requireAdmin, async (req, res) => {
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

    // ── Synthetic Activity Generator (powers dashboard in dev/staging) ──
    // Synthetic activity: opt-IN for dev/staging only — never runs in production
    if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_SYNTHETIC_LOAD !== 'true') {
        const SEED_NODES = [
            { wallet: '0xNodeAlpha001', node_type: 'self_hosted', active: 1 },
            { wallet: '0xNodeBeta002',  node_type: 'self_hosted', active: 1 },
            { wallet: '0xNodeGamma003', node_type: 'managed',     active: 1 },
            { wallet: '0xNodeDelta004', node_type: 'self_hosted', active: 1 },
            { wallet: '0xNodeEpsilon005', node_type: 'managed',   active: 0 },
        ];

        const OP_TYPES = [
            'api_relay_execution',
            'automation_job_execute',
            'routing_decision_compute',
            'compute_task_standard',
            'monitoring_op',
        ];

        const CLIENTS = ['client_alpha', 'client_beta', 'client_gamma'];

        // Seed nodes + start activity loop after opsEngine is ready
        (async () => {
            try {
                // Initialize opsEngine (creates system_config, pricing tables, etc.)
                await global.opsEngine.init();

                // Seed test nodes into registered_nodes
                for (const node of SEED_NODES) {
                    await db.prepare(`
                        INSERT INTO registered_nodes (wallet, node_type, active, last_heartbeat, updatedAt)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(wallet) DO UPDATE SET active = EXCLUDED.active, last_heartbeat = EXCLUDED.last_heartbeat
                    `).run(node.wallet, node.node_type, node.active, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));
                }
                console.log(`[SYNTHETIC] Seeded ${SEED_NODES.length} test nodes`);

                // Ensure an open epoch exists
                await global.opsEngine.initEpoch();

                // Ensure system_flags table exists (admin control room queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS system_flags (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at BIGINT
                )`);
                // Add updated_by column if missing (safe migration)
                try { await db.exec(`ALTER TABLE system_flags ADD COLUMN IF NOT EXISTS updated_by TEXT`); } catch (_) {}
                // Seed defaults
                await db.exec(`INSERT INTO system_flags (key, value, updated_at) VALUES ('withdrawals_paused', '0', EXTRACT(EPOCH FROM NOW())::BIGINT) ON CONFLICT(key) DO NOTHING`);
                await db.exec(`INSERT INTO system_flags (key, value, updated_at) VALUES ('security_freeze', '0', EXTRACT(EPOCH FROM NOW())::BIGINT) ON CONFLICT(key) DO NOTHING`);
                await db.exec(`INSERT INTO system_flags (key, value, updated_at) VALUES ('revenue_mode', 'ACTIVE', EXTRACT(EPOCH FROM NOW())::BIGINT) ON CONFLICT(key) DO NOTHING`);

                // Ensure security_alerts table exists (SSE stream queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS security_alerts (
                    id SERIAL PRIMARY KEY,
                    alert_type TEXT,
                    severity TEXT DEFAULT 'medium',
                    message TEXT,
                    status TEXT DEFAULT 'open',
                    resolution_notes TEXT,
                    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
                )`);

                // Ensure error_events table exists (SSE stream queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS error_events (
                    id SERIAL PRIMARY KEY,
                    endpoint TEXT,
                    message TEXT,
                    status_code INTEGER,
                    count INTEGER DEFAULT 1,
                    last_seen_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
                )`);

                // Ensure slow_queries table exists (admin dashboard queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS slow_queries (
                    id SERIAL PRIMARY KEY,
                    query_text TEXT,
                    duration_ms REAL,
                    count INTEGER DEFAULT 1,
                    last_seen_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
                )`);

                // Ensure incident_bundles table exists (SSE stream queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS incident_bundles (
                    id SERIAL PRIMARY KEY,
                    title TEXT,
                    severity TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'open',
                    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
                )`);

                // Ensure admin_audit_log table exists (SSE stream queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS admin_audit_log (
                    id SERIAL PRIMARY KEY,
                    actor_wallet TEXT,
                    action_type TEXT,
                    target_type TEXT,
                    target_id TEXT,
                    before_json TEXT,
                    after_json TEXT,
                    ip_hash TEXT,
                    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
                )`);

                // Ensure pricing_rules table exists (executeOp queries it)
                await db.exec(`CREATE TABLE IF NOT EXISTS pricing_rules (
                    op_type TEXT PRIMARY KEY,
                    base_price_usdt REAL NOT NULL,
                    version INTEGER DEFAULT 1,
                    surge_enabled INTEGER DEFAULT 0,
                    surge_threshold INTEGER DEFAULT 100,
                    surge_multiplier REAL DEFAULT 1.5
                )`);

                // Ensure execution_metrics table exists
                await db.exec(`CREATE TABLE IF NOT EXISTS execution_metrics (
                    id SERIAL PRIMARY KEY,
                    op_type TEXT,
                    node_id TEXT,
                    duration_ms REAL,
                    success INTEGER,
                    created_at BIGINT
                )`);

                // op_counts table already exists (schema: epoch_id, user_wallet, op_type, ops, weight, created_at)

                console.log('[SYNTHETIC] Activity generator starting (every 3-6 seconds)');

                // Continuous synthetic activity loop
                const runSyntheticOp = async () => {
                    try {
                        const activeNodes = SEED_NODES.filter(n => n.active === 1);
                        const node = activeNodes[Math.floor(Math.random() * activeNodes.length)];
                        const opType = OP_TYPES[Math.floor(Math.random() * OP_TYPES.length)];
                        const client = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
                        const requestId = `syn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                        const result = await global.opsEngine.executeOp({
                            op_type: opType,
                            node_id: node.wallet,
                            client_id: client,
                            request_id: requestId,
                            timestamp: Math.floor(Date.now() / 1000),
                            payload_hash: `hash_${requestId}`,
                        });

                        // Update node heartbeat to keep them "alive"
                        const now = Math.floor(Date.now() / 1000);
                        await db.prepare(
                            'UPDATE registered_nodes SET last_heartbeat = ?, updatedAt = ? WHERE wallet = ?'
                        ).run(now, now, node.wallet);

                        // Update op_counts (existing table schema: epoch_id, user_wallet, op_type, ops, weight)
                        try {
                            const epoch = await db.prepare("SELECT id FROM epochs WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1").get();
                            if (epoch) {
                                await db.prepare(`
                                    INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at)
                                    VALUES (?, ?, ?, 1, 1.0, ?)
                                    ON CONFLICT DO NOTHING
                                `).run(epoch.id, node.wallet, opType, now);
                            }
                        } catch (_) { /* op_counts update is non-critical */ }

                        console.log(`[SYNTHETIC] ${opType} → $${result.amount?.toFixed(4) || '0.0000'} | node=${node.wallet.slice(0, 12)} | client=${client}`);
                    } catch (e) {
                        console.error('[SYNTHETIC] Op failed:', e.message);
                    }

                    // Schedule next op in 3-6 seconds (randomized for realistic feel)
                    const delay = 3000 + Math.floor(Math.random() * 3000);
                    setTimeout(runSyntheticOp, delay);
                };

                // Start the loop
                setTimeout(runSyntheticOp, 2000);

            } catch (e) {
                console.error('[SYNTHETIC] Failed to initialize:', e.message);
            }
        })();

        // Manual trigger endpoint for testing
        app.get('/dev/generate-activity', async (req, res) => {
            try {
                const node = SEED_NODES[Math.floor(Math.random() * SEED_NODES.filter(n => n.active).length)];
                const opType = OP_TYPES[Math.floor(Math.random() * OP_TYPES.length)];
                const requestId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                const result = await global.opsEngine.executeOp({
                    op_type: opType,
                    node_id: node.wallet,
                    client_id: 'manual_test',
                    request_id: requestId,
                    timestamp: Math.floor(Date.now() / 1000),
                    payload_hash: `hash_${requestId}`,
                });

                res.json({ ok: true, result });
            } catch (e) {
                res.status(500).json({ ok: false, error: e.message });
            }
        });
    }

    // Catch-all
    app.all('*catchall', (req, res) => {
        res.status(404).json({ ok: false, error: "Not Found" });
    });
}
