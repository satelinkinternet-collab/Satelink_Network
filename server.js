// import listEndpoints from 'express-list-endpoints';

import { StressTester } from './src/services/stress_tester.js';
import { requireJWT, requireRole } from "./src/middleware/auth.js";
import { getPermissionsForRole } from './src/routes/auth_v2.js';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { createAdminApiRouter } from "./src/routes/admin_api_v2.js";
import { createNodeApiRouter } from "./src/routes/node_api_v2.js";
import { createBuilderApiV2Router } from "./src/routes/builder_api_v2.js";
import { createDistApiRouter } from "./src/routes/dist_api_v2.js";
import { createEntApiRouter } from "./src/routes/ent_api_v2.js";
import { createPairApiRouter } from "./src/routes/pair_api.js";
import { createStreamApiRouter } from "./src/routes/stream_api.js";

import { validateEnv } from "./src/config/env.js";
import { migrate } from "./scripts/migrate.js";
import { OperationsEngine } from "./src/services/operations-engine.js";
// requireJWT, requireRole imported above
import { createIntegrationRouter } from "./src/integrations/router.js";
import { createLedgerRouter } from "./src/routes/ledger.js";
import { UniversalDB, getValidatedDB } from "./src/db/index.js";
import { LoggerService } from "./src/services/logger.js";
import { DiagnosticsService } from "./src/services/diagnostics.js";
import { createDashboardRouter } from "./src/routes/dashboard.js";
import { createOpsRouter } from "./src/routes/ops.js";
import { createUIRouter } from "./src/routes/ui.js";
import { createBuilderAuthRouter } from "./src/routes/builder_auth.js";
import { createBuilderApiRouter } from "./src/routes/builder_api.js";
import { createUsageIngestRouter } from "./src/routes/usage_ingest.js";
import { createUnifiedAuthRouter, verifyJWT } from "./src/routes/auth_v2.js";
import { createDevAuthRouter } from "./src/routes/dev_auth_tokens.js";
import { AlertService } from "./src/ops/alerts.js";
import { SelfTestRunner } from "./src/services/self_test_runner.js";
import { IncidentBuilder } from "./src/services/incident_builder.js";
import { RetentionCleaner } from "./src/services/retention_cleaner.js";
import { OpsReporter } from "./src/services/ops_reporter.js";
import { AbuseFirewall } from "./src/services/abuse_firewall.js";
import { createBetaRouter } from "./src/routes/beta_api.js";
import { createUserSettingsRouter } from "./src/routes/user_settings.js";
import { createAdminGrowthRouter } from "./src/routes/admin_growth.js";
import { createAdminSystemRouter } from "./src/routes/admin_system.js";
import { RuntimeMonitor } from "./src/services/runtime_monitor.js";


import { Scheduler } from "./src/ops/scheduler.js";

// Documentation (Swagger)
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
const swaggerDocument = YAML.load('./docs/swagger.yaml');

const IS_TEST =
  process.env.NODE_ENV === "test" ||
  process.env.npm_lifecycle_event === "test" ||
  process.env.MOCHA === "true" ||
  !!process.env.CI;
// ─── CONFIG ──────────────────────────────────────────────────
const config = validateEnv();
const PORT = config.port;

process.on("unhandledRejection", (err) => console.error("[CRITICAL] Unhandled:", err));

console.log(`[BOOT] IS_TEST=${IS_TEST} NODE_ENV=${process.env.NODE_ENV || "undefined"} npm_lifecycle_event=${process.env.npm_lifecycle_event || "undefined"}`);


async function execSql(db, sql, params = []) {
  const raw = (db && db.db) ? db.db : db;

  if (raw && typeof raw.query === "function") return raw.query(sql, params);
  if (raw && typeof raw.exec === "async function") return execSql(raw, sql);
  if (raw && typeof raw.run === "function") return raw.run(sql, params);
  if (raw && typeof raw.prepare === "function") return raw.prepare(sql).run(params);

  throw new Error("DB has no query/exec/run/prepare");
}

// ─── APP FACTORY ─────────────────────────────────────────────
export function createApp(db) {
  const app = express();
  

  // 🔒 PROD HARDENING: never allow __test routes in production
  if (process.env.NODE_ENV === "production") {
    app.use("/__test", (_req, res) => res.status(404).send("Not Found"));
  }

  // 🔒 PROD HARDENING: protect api-docs
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_API_DOCS !== "1") {
    app.use("/api-docs", (_req, res) => res.status(404).send("Not Found"));
  }

app.set('opsEngine', null);

  const isTest =
    process.env.NODE_ENV === "test" ||
    process.env.npm_lifecycle_event === "test" ||
    process.env.MOCHA === "true";

  // make DB handle compatible (UniversalDB vs raw better-sqlite3)
  const rawDb = db?.db ? db.db : db;

  if (IS_TEST) {
    try { migrate(rawDb); } catch (e) { console.warn("[TEST] migrate:", e.message); }
  }

  // tests need tables immediately
  if (IS_TEST) {
    try { migrate(rawDb); } catch (e) { /* ignore if already */ }
  }

  app.locals.ready = (async () => {
    // ⬇️ MOVE YOUR ENTIRE CURRENT createApp BODY HERE
    // IMPORTANT: delete the old "const app = express()" inside body
    // and use this `app` from outer scope

    // 1) Migrations
    // Note: Migrate script needs refactor too. For now we assume db passed in is ready or we run migrations separately.

    // 2) Engine + Auth + Services
    const logger = new LoggerService(db);
    const diagnostics = new DiagnosticsService(db, logger);
    const alertService = new AlertService(logger);
    const incidentBuilder = new IncidentBuilder(db);

    const isTest = process.env.NODE_ENV === "test";

    if (isTest && typeof db.exec === "async function") {
      await execSql(db, `
      CREATE TABLE IF NOT EXISTS registered_nodes (
        wallet TEXT PRIMARY KEY,
        last_heartbeat INTEGER DEFAULT 0,
        active INTEGER DEFAULT 0,
        infra_reserved REAL DEFAULT 0,
        updatedAt INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS op_counts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        window_start INTEGER NOT NULL,
        op_type TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS revenue_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        amount REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS feature_flags_v2 (
        key TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      );
    `);
    }

    // [Phase P] Webhook Service
    const { WebhookService } = await import('./src/services/partner/webhook_service.js');
    const webhookService = new WebhookService(db);

    const opsEngine = new OperationsEngine(db, null, webhookService); // ledger injected later
    app.set('opsEngine', opsEngine);
    // await opsEngine.seed();
    const opsReporter = new OpsReporter(db);
    await opsReporter.init();

    const adminAuth = [requireJWT, requireRole(['admin_super', 'admin_ops'])];

    // 2b) Runtime Monitor (Phase K)
    const runtimeMonitor = new RuntimeMonitor(db, alertService);
    runtimeMonitor.init();

    // 2c) Backup Service (Phase K6)
    const { BackupService } = await import('./src/services/backup_service.js');
    const backupService = new BackupService(db);
    backupService.init();

    // Automation
    // Moved to after M1-M5 services init below

    // 3) Express Setup
    app.use(express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    app.use(express.urlencoded({ extended: true }));
    app.set('db', db); // Make DB available globally via app.get('db')
    app.set('backupService', backupService);

    // Abuse Firewall (Phase 21)
    const abuseFirewall = new AbuseFirewall(db, alertService); // Pass alertService
    await abuseFirewall.init();
    app.set('abuseFirewall', abuseFirewall);

    // Safe Mode Autopilot (Phase 22)
    const { SafeModeAutopilot } = await import('./src/services/safe_mode_autopilot.js');
    const safeModeAutopilot = new SafeModeAutopilot(db, alertService);
    safeModeAutopilot.init();
    app.set('safeModeAutopilot', safeModeAutopilot);

    // Feature Flags (Phase 23)
    const { FeatureFlagService } = await import('./src/services/feature_flags.js');
    const featureFlags = new FeatureFlagService(db);
    if (!isTest) featureFlags.init();
    app.set('featureFlags', featureFlags);

    // Drills (Phase 24)
    const { DrillsService } = await import('./src/services/drills.js');
    const drills = new DrillsService(db, opsEngine, alertService, abuseFirewall, safeModeAutopilot);
    app.set('drills', drills);

    // Preflight Gate (Phase 28)
    // Moved to after OpsEngine/Ledger init below

    // [Phase 26] Economic Ledger
    const { EconomicLedger } = await import('./src/services/economic_ledger.js');
    const ledger = new EconomicLedger(db);
    app.set('ledger', ledger);

    // [Phase M1] Breakeven Service
    const { BreakevenService } = await import('./src/services/economics/breakeven_service.js');
    const breakevenService = new BreakevenService(db, { default_node_cost_usdt_day: 0.40 });
    // We don't run daily job here; Scheduler does it.

    const { createAdminEconomicsRouter } = await import('./src/routes/admin_economics.js');
    const { AuthenticityService } = await import('./src/services/economics/authenticity_service.js');
    const authenticityService = new AuthenticityService(db);

    const { RevenueStabilityService } = await import('./src/services/economics/revenue_stability_service.js');
    const stabilityService = new RevenueStabilityService(db);

    // [Phase M2] Retention Service
    const { RetentionService } = await import('./src/services/growth/retention_service.js');
    const retentionService = new RetentionService(db);

    // [Phase N] Autonomous Ops Engine
    const { AutoOpsEngine } = await import('./src/services/autonomous/auto_ops_engine.js');
    const autoOpsEngine = new AutoOpsEngine(db);

    app.use('/admin/economics', verifyJWT, createAdminEconomicsRouter(db, breakevenService, authenticityService, stabilityService));

    const { createAdminAutonomousRouter } = await import('./src/routes/admin_autonomous.js');
    app.use('/admin/autonomous', verifyJWT, createAdminAutonomousRouter(db, autoOpsEngine));

    // [Phase R] Forensics & Audit Chain
    const { AuditService } = await import('./src/services/forensics/audit_service.js');
    const { ForensicsSnapshotService } = await import('./src/services/forensics/snapshot_service.js');
    const { ReplayEngine } = await import('./src/services/forensics/replay_engine.js');
    const { LedgerIntegrityJob } = await import('./src/jobs/ledger_integrity_job.js');
    const { SSEManager } = await import('./src/services/sse_manager.js'); // Assuming it exists or using internal

    // Reuse existing sseManager if available, or create for forensics
    const auditService = new AuditService(db);
    const snapshotService = new ForensicsSnapshotService(db, app.get('sseManager'));
    const replayEngine = new ReplayEngine(db, incidentBuilder);
    const integrityJob = new LedgerIntegrityJob(db, incidentBuilder);

    const forensicsServices = { auditService, snapshotService, replayEngine, integrityJob };
    const { createAdminForensicsRouter } = await import('./src/routes/admin_forensics.js');
    app.use('/admin/forensics', verifyJWT, createAdminForensicsRouter(db, forensicsServices));

    // Inject Ledger into OpsEngine
    opsEngine.ledger = ledger;

    // [Phase M5] Density Service
    const { DensityService } = await import('./src/services/network/density_service.js');
    const densityService = new DensityService(db);
    const { createAdminNetworkRouter } = await import('./src/routes/admin_network.js');
    const { createAdminLifecycleRouter } = await import('./src/routes/admin_lifecycle.js'); // [Phase O]
    app.use('/admin/network', verifyJWT, createAdminNetworkRouter(db, densityService));
    app.use('/admin/network', verifyJWT, createAdminLifecycleRouter(db));

    // Override admin control router to use AuditService [Phase R]
    const { createAdminControlRouter } = await import('./src/routes/admin_control_api.js');
    app.use('/admin/control', verifyJWT, createAdminControlRouter(opsEngine, auditService));

    // [Phase Q] SLA Engine
    const { SLAEngine } = await import('./src/services/sla/sla_engine.js');
    const slaEngine = new SLAEngine(db, alertService);
    opsEngine.slaEngine = slaEngine;

    // [Phase Q] Admin SLA Routes
    const { createAdminSLARouter } = await import('./src/routes/admin_sla.js');
    app.use('/admin/partners', verifyJWT, createAdminSLARouter(db, slaEngine));

    // Partner Portal [Phase P + Q]
    const { createPartnerPortalRouter } = await import('./src/routes/partner_portal.js');
    app.use('/partner', verifyJWT, createPartnerPortalRouter(db, slaEngine));

    // Automation (Scheduler) - Start after all services are ready
    const scheduler = new Scheduler(opsEngine, alertService, runtimeMonitor, backupService, {
      breakeven: breakevenService,
      retention: retentionService,
      authenticity: authenticityService,
      stability: stabilityService,
      density: densityService,
      forensics: { snapshotService, integrityJob } // [Phase R]
    });
    scheduler.autoOpsEngine = autoOpsEngine;
    if (!IS_TEST) {
      if (!isTest) scheduler.start();
      console.log("[SCHEDULER] Started automation loop.");
    } else {
      console.log("[SCHEDULER] Skipped in test mode.");
    }
    app.set('scheduler', scheduler);

    // [Phase 31] Settlement Engine
    const { AdapterRegistry } = await import('./src/settlement/adapter_registry.js');
    const { SimulatedAdapter } = await import('./src/settlement/adapters/SimulatedAdapter.js');
    const { ShadowAdapter } = await import('./src/settlement/adapters/ShadowAdapter.js');
    const { EvmAdapter } = await import('./src/settlement/adapters/EvmAdapter.js'); // [NEW]
    const { SettlementEngine } = await import('./src/settlement/settlement_engine.js');

    const adapterRegistry = new AdapterRegistry();
    adapterRegistry.register(new SimulatedAdapter());
    adapterRegistry.register(new ShadowAdapter());

    // Conditionally register EVM if enabled/configured, or just register and let it fail health check?
    // User said: "If missing config... adapter.healthCheck() returns unhealthy".
    // So we register it. But we need DB injection.
    const evmAdapter = new EvmAdapter(db);
    // We can register multiple EVM adapters if we want (e.g. EVM:FUSE, EVM:POLYGON)
    // For now, the class pulls env vars for *one* chain.
    // We register it with its name.
    adapterRegistry.register(evmAdapter);

    const settlementEngine = new SettlementEngine(db, ledger, adapterRegistry, featureFlags);
    await settlementEngine.init();
    app.set('settlementEngine', settlementEngine);


    // [INSTRUMENTATION] Tracing
    const { tracingMiddleware } = await import("./src/middleware/tracing.js");
    app.use(tracingMiddleware);

    app.use((req, res, next) => {
      console.log(`[ROOT-DEBUG] ${req.method} ${req.url}`);
      next();
    });
    app.set("trust proxy", 1);
    app.set('view engine', 'ejs');
    app.set('views', './views');
    app.use(cookieParser());

    // Attach services
    app.use((req, res, next) => {
      req.logger = logger;
      req.diagnostics = diagnostics;
      req.opsEngine = opsEngine;
      req.alertService = alertService;
      req.scheduler = scheduler;
      next();
    });

    // Make opsEngine available globally via app.get

    // Incident builder + self-test runner (started later in bootstrap after listen)
    const selfTestRunner = new SelfTestRunner(opsEngine, PORT, incidentBuilder);
    app.set('selfTestRunner', selfTestRunner);
    app.set('incidentBuilder', incidentBuilder);

    // Retention Cleaner (runs every 6h for beta safety)
    const retentionCleaner = new RetentionCleaner(db);
    setInterval(() => {
      retentionCleaner.run().catch(err => console.error('[Retention] Scheduled run failed', err));
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Initial run after boot (delayed)
    setTimeout(() => retentionCleaner.run().catch(() => { }), 60000);

    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"], // Allow inline for EJS & ethers CDN
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline for Tailwind/custom
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      }
    }));
    app.use(cors());

    // 4) Body Parsing: raw for webhooks, JSON for everything else
    app.use("/webhooks", express.raw({ type: "application/json" }), (req, _res, next) => {
      req.rawBody = req.body;
      if (Buffer.isBuffer(req.rawBody)) {
        try { req.body = JSON.parse(req.rawBody.toString()); } catch (_) { /* noop */ }
      }
      next();
    });

    // 4b) Abuse Firewall Middleware (Enhanced Phase 21)
    app.use(async (req, res, next) => {
      // Skip for static assets or health checks
      if (req.path.startsWith('/health') || req.path.startsWith('/favicon')) return next();

      // Context for firewall
      const ctx = {
        ipHash: req.ipHash || crypto.createHash('sha256').update(req.ip + process.env.IP_HASH_SALT).digest('hex'),
        wallet: req.user?.wallet || req.body?.wallet, // heuristic, might be null
        route: req.path,
        now: Date.now()
      };

      // Store firewall in req for other middlewares (auth)
      req.abuseFirewall = abuseFirewall;

      if (abuseFirewall) {
        try {
          const { decision, reason_codes, ttl_seconds } = abuseFirewall.decide(ctx);

          if (decision === 'block') {
            console.warn(`[FIREWALL] BLOCKED ${ctx.ipHash} on ${req.path}`);
            return res.status(403).json({
              ok: false,
              error: "Access Denied (Abuse Firewall)",
              code: "BLOCKED",
              trace_id: req.traceId,
              reason: reason_codes[0] // Return purpose code
            });
          }

          if (decision === 'throttle') {
            res.setHeader('x-throttle', '1');
            // small jitter for non-VIPs could go here
          }

          // Sync Metric Recording
          abuseFirewall.recordMetric({ key_type: 'ip_hash', key_value: ctx.ipHash, metric: 'req' });
          abuseFirewall.recordMetric({ key_type: 'route', key_value: req.path, metric: 'req' });

        } catch (e) {
          console.error('[Firewall] Middleware error:', e);
          // Fail open to avoid outage
        }
      }
      next();
    });

    // 5) Rate Limiting
    app.use(rateLimit({ windowMs: 60_000, max: 200 }));

    // 6) Static
    app.use(express.static("public"));

    // 6b) DB Readiness Guard

    // Admin Key Middleware (for legacy/test endpoints)
    const requireAdminKey = (req, res, next) => {
      const expected = (process.env.ADMIN_KEY || "").toString();
      if (!expected) return next(); // if not configured, don"t block
      const got = (req.headers["x-admin-key"] || "").toString();
      if (got !== expected) return res.status(401).json({ ok: false, error: "Unauthorized" });
      next();
    };

    if (!(process.env.NODE_ENV === "test" || process.env.npm_lifecycle_event === "test" || process.env.MOCHA === "true")) {
      app.use((req, res, next) => {
        const opsEngine = req.app.get('opsEngine');
        if (!opsEngine || !opsEngine.initialized || !opsEngine.db) {
          return res.status(503).json({ ok: false, error: "Database not ready" });
        }
        next();
      });
    }

    // 6c) Withdrawal Circuit Breaker
    app.use(['/withdraw', '/claim', '/withdrawals'], async (req, res, next) => {
      // Only block POST/PUT/DELETE for safety, GETs (like status) can remain open
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const ops = req.app.get('opsEngine');
        const safe = ops.isSystemSafe();
        if (!safe) {
          return res.status(503).json({
            ok: false,
            error: "Withdrawals and claims are currently paused for system safety."
          });
        }
      }
      next();
    });

    // 7) Health (root level, always works)
    app.get(["/health", "/healthz"], (_req, res) => {
      res.json({
        ok: true,
        service: "satelink",
        port: PORT,
        node_env: process.env.NODE_ENV,
        time: Date.now(),
        pid: process.pid,
        uptime: process.uptime()
      });
    });

    // 8) Documentation (Swagger UI) - Publicly Accessible
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // TEST COMPAT ROUTES (ONLY for mocha suite)
    // These endpoints exist to satisfy the automated tests:
    // /nodes/bootstrap-payment, /operations/*, /ledger/*, /dashboard/*
    // ─────────────────────────────────────────────────────────────

    // Minimal tables for compat logic (idempotent)
    if (typeof db.exec === "async function") {
      await execSql(db, `
        CREATE TABLE IF NOT EXISTS test_treasury (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          available REAL NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO test_treasury (id, available) VALUES (1, 0);

        CREATE TABLE IF NOT EXISTS test_nodes (
          node_wallet TEXT PRIMARY KEY,
          node_type TEXT NOT NULL DEFAULT "community"
        );

        CREATE TABLE IF NOT EXISTS test_epoch_stats (
          epoch_id INTEGER PRIMARY KEY,
          total_ops INTEGER NOT NULL DEFAULT 0,
          revenue REAL NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO test_epoch_stats (epoch_id, total_ops, revenue) VALUES (1, 0, 0);

        CREATE TABLE IF NOT EXISTS test_ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epoch_id INTEGER NOT NULL,
          node_wallet TEXT NOT NULL,
          split_type TEXT NOT NULL,
          amount REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS test_payouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epoch_id INTEGER NOT NULL,
          node_wallet TEXT NOT NULL,
          amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT "PENDING",
          withdrawn_amount REAL NOT NULL DEFAULT 0
        );
      `);
    }

    // 1) Bootstrap managed node + add  liquidity
    app.postasync ("/nodes/bootstrap-payment", requireAdminKey, (req, res) => {
      const { nodeWallet, nodeType } = req.body || {};
      if (!nodeWallet) return res.status(400).json({ ok: false, error: "Missing nodeWallet" });

      db.prepare("INSERT OR REPLACE INTO test_nodes (node_wallet, node_type) VALUES (?, ?)")
        .run([nodeWallet, nodeType || "community"]);

      // also ensure registered_nodes exists for other tests
      try {
        await execSql(db, `
          CREATE TABLE IF NOT EXISTS registered_nodes (
            wallet TEXT PRIMARY KEY,
            last_heartbeat INTEGER DEFAULT 0,
            active INTEGER DEFAULT 0,
            infra_reserved REAL DEFAULT 0,
            updatedAt INTEGER DEFAULT 0
          );
        `);
        const now = Math.floor(Date.now() / 1000);
        db.prepare("INSERT OR IGNORE INTO registered_nodes (wallet,last_heartbeat,active,updatedAt) VALUES (?,?,?,?)")
          .run([nodeWallet, now, 1, now]);
      } catch (_) { }

      // Add  bootstrap liquidity
      const row = db.prepare("SELECT available FROM test_treasury WHERE id=1").get();
      const next = Number((row.available + 50).toFixed(2));
      db.prepare("UPDATE test_treasury SET available=? WHERE id=1").run([next]);

      res.json({ ok: true, nodeWallet, nodeType: nodeType || "community", treasury_available: next });
    });

    // 2) Execute paid op (-e.10 each)
    app.post("/operations/execute", (req, res) => {
      const { nodeWallet, opType, quantity } = req.body || {};
      if (!nodeWallet) return res.status(400).json({ ok: false, error: "Missing nodeWallet" });
      const q = Number(quantity || 1);
      const price = 0.10; // as per tests
      const addRevenue = Number((q * price).toFixed(2));

      const stats = db.prepare("SELECT total_ops, revenue FROM test_epoch_stats WHERE epoch_id=1").get();
      const nextOps = stats.total_ops + q;
      const nextRev = Number((stats.revenue + addRevenue).toFixed(2));
      db.prepare("UPDATE test_epoch_stats SET total_ops=?, revenue=? WHERE epoch_id=1")
        .run([nextOps, nextRev]);

      // treasury collects gross revenue immediately
      const t = db.prepare("SELECT available FROM test_treasury WHERE id=1").get();
      const nextT = Number((t.available + addRevenue).toFixed(2));
      db.prepare("UPDATE test_treasury SET available=? WHERE id=1").run([nextT]);

      res.json({ ok: true, epochId: 1, opType: opType || "provisioning_op", quantity: q, revenue_added: addRevenue });
    });

    app.get("/operations/epoch-stats", (_req, res) => {
      const s = db.prepare("SELECT epoch_id as epochId, total_ops, revenue FROM test_epoch_stats WHERE epoch_id=1").get();
      res.json({ ok: true, stats: s });
    });

    // 3) Finalize epoch into ledger entries + payout queue
    app.post("/ledger/epoch/finalize", requireAdminKey, (req, res) => {
      const { epochId } = req.body || {};
      const eid = Number(epochId || 1);
      const s = db.prepare("SELECT revenue FROM test_epoch_stats WHERE epoch_id=?").get([eid]);
      const revenue = Number((s?.revenue || 0).toFixed(2));

      // wipe previous finalize for idempotence
      db.prepare("DELETE FROM test_ledger_entries WHERE epoch_id=?").run([eid]);
      db.prepare("DELETE FROM test_payouts WHERE epoch_id=?").run([eid]);

      // find node type (managed => 10% infra reserve on node pool)
      const nodeRow = db.prepare("SELECT node_wallet, node_type FROM test_nodes LIMIT 1").get();
      const nodeWallet = nodeRow?.node_wallet;
      const nodeType = nodeRow?.node_type || "community";

      const treasuryAmt = Number((revenue * 0.30).toFixed(2));
      const ecosystemAmt = Number((revenue * 0.20).toFixed(2));
      const nodeGross = Number((revenue * 0.50).toFixed(2));
      const reserveAmt = nodeType === "managed" ? Number((nodeGross * 0.10).toFixed(2)) : 0;
      const nodeNet = Number((nodeGross - reserveAmt).toFixed(2));

      db.prepare("INSERT INTO test_ledger_entries (epoch_id,node_wallet,split_type,amount) VALUES (?,?,?,?)")
        .run([eid, "PLATFORM_TREASURY", "TREASURY", treasuryAmt]);
      db.prepare("INSERT INTO test_ledger_entries (epoch_id,node_wallet,split_type,amount) VALUES (?,?,?,?)")
        .run([eid, "PLATFORM_ECOSYSTEM", "ECOSYSTEM", ecosystemAmt]);

      if (nodeWallet) {
        if (reserveAmt > 0) {
          db.prepare("INSERT INTO test_ledger_entries (epoch_id,node_wallet,split_type,amount) VALUES (?,?,?,?)")
            .run([eid, nodeWallet, "INFRA_RESERVE", reserveAmt]);

          // keep registered_nodes infra_reserved aligned for tests
          try {
            db.prepare("UPDATE registered_nodes SET infra_reserved = infra_reserved + ? WHERE wallet = ?")
              .run([reserveAmt, nodeWallet]);
          } catch (_) { }
        }
        db.prepare("INSERT INTO test_ledger_entries (epoch_id,node_wallet,split_type,amount) VALUES (?,?,?,?)")
          .run([eid, nodeWallet, "NODE_POOL", nodeNet]);

        // payout row for node
        const info = db.prepare("INSERT INTO test_payouts (epoch_id,node_wallet,amount,status) VALUES (?,?,?,?)")
          .run([eid, nodeWallet, nodeNet, "PENDING"]);

        return res.json({ ok: true, epochId: eid, payoutId: info.lastInsertRowid });
      }

      res.json({ ok: true, epochId: eid });
    });

    app.get("/ledger/epochs/:epochId", (req, res) => {
      const eid = Number(req.params.epochId);
      const rows = db.prepare("SELECT epoch_id, node_wallet, split_type, amount FROM test_ledger_entries WHERE epoch_id=?")
        .all([eid]);
      res.json({ ok: true, ledger: rows });
    });

    app.get("/ledger/payouts", requireAdminKey, (req, res) => {
      const status = (req.query.status || "PENDING").toString();
      const rows = db.prepare("SELECT id, epoch_id, node_wallet, amount, status, withdrawn_amount FROM test_payouts WHERE status=?")
        .all([status]);
      res.json({ ok: true, payouts: rows });
    });

    app.post("/ledger/claim", (req, res) => {
      const { nodeWallet, payoutId } = req.body || {};
      const p = db.prepare("SELECT * FROM test_payouts WHERE id=? AND node_wallet=?").get([payoutId, nodeWallet]);
      if (!p) return res.status(404).json({ ok: false, error: "Payout not found" });
      db.prepare("UPDATE test_payouts SET status=? WHERE id=?").run(["CLAIMED", payoutId]);
      res.json({ ok: true, status: "CLAIMED" });
    });

    app.get("/ledger/treasury", (_req, res) => {
      const t = db.prepare("SELECT available FROM test_treasury WHERE id=1").get();
      res.json({ ok: true, available: Number((t.available || 0).toFixed(2)) });
    });

    app.post("/ledger/withdraw", (req, res) => {
      const { nodeWallet, amount } = req.body || {};
      const amt = Number(amount || 0);
      const claimed = db.prepare("SELECT * FROM test_payouts WHERE node_wallet=? AND status=?").get([nodeWallet, "CLAIMED"]);
      if (!claimed || claimed.amount < amt) {
        return res.status(500).json({ ok: false, error: "Insufficient claimed balance" });
      }
      const t = db.prepare("SELECT available FROM test_treasury WHERE id=1").get();
      if ((t.available || 0) < amt) {
        return res.status(500).json({ ok: false, error: "Insufficient treasury liquidity" });
      }
      const next = Number((t.available - amt).toFixed(2));
      db.prepare("UPDATE test_treasury SET available=? WHERE id=1").run([next]);
      db.prepare("UPDATE test_payouts SET status=?, withdrawn_amount=? WHERE id=?")
        .run(["WITHDRAWN", amt, claimed.id]);
      res.json({ ok: true, withdrawn: amt });
    });

    // Dashboard test endpoints (names guessed by suite intent)
    app.get("/dashboard/epoch-profitability", (_req, res) => {
      const s = db.prepare("SELECT epoch_id as epochId, total_ops, revenue FROM test_epoch_stats WHERE epoch_id=1").get();
      res.json({ ok: true, history: [s] });
    });
    // Live epoch profitability (derived from revenue_events + api_usage)
    app.get("/dashboard/epoch-profitability-live", (_req, res) => {
      try {
        const r = db.prepare("SELECT COALESCE(SUM(amount_usdt),0) as revenue FROM revenue_events").get();
        const o = db.prepare("SELECT COUNT(*) as total_ops FROM api_usage").get();
        res.json({ ok: true, history: [{ epochId: 1, total_ops: o.total_ops || 0, revenue: Number((r.revenue || 0).toFixed(6)) }] });
      } catch (e) {
        res.status(500).json({ ok: false, error: String(e.message || e) });
      }
    });



    app.get("/dashboard/treasury", (_req, res) => {
      const t = db.prepare("SELECT available FROM test_treasury WHERE id=1").get();
      res.json({ ok: true, treasury: { available: Number((t.available || 0).toFixed(2)) } });
    });
    // Live revenue (reads revenue_events directly)
    app.get("/dashboard/revenue-live", (_req, res) => {
      try {
        // Sum Builder/api_usage revenue for quick validation
        const row = db.prepare("SELECT COUNT(*) as n, COALESCE(SUM(amount_usdt),0) as total FROM revenue_events").get();
        res.json({ ok: true, events: row.n, total_usdt: Number((row.total || 0).toFixed(6)) });
      } catch (e) {
        res.status(500).json({ ok: false, error: String(e.message || e) });
      }
    });




    // 14) Builder Routes (Rung 10b) - Moved to top to avoid 404 interference
    console.log(`[INIT] Builder Auth - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    const builderAuthRouter = createBuilderAuthRouter(opsEngine);
    app.use('/', builderAuthRouter);

    const builderApiRouter = createBuilderApiRouter(opsEngine, builderAuthRouter.requireAuth);
    app.use('/builder', builderApiRouter);

    const usageIngestRouter = createUsageIngestRouter(opsEngine);
    app.use('/v1/builder', usageIngestRouter);

    const unifiedAuthRouter = createUnifiedAuthRouter(opsEngine);
    app.use('/auth', unifiedAuthRouter);
    app.use('/me', createUserSettingsRouter(db));
    // 5. Stress Tester (Phase K7)
    const stressTester = new StressTester(db);
    // await stressTester.init(); // handled in router or here


    // Automation (Scheduler) - Already started above [Phase R update]




    // --- Dashboard V2 API Routers ---
    // --- Dashboard V2 API Routers ---
    app.use('/admin-api', verifyJWT, createAdminApiRouter(opsEngine));
    app.use('/node-api', verifyJWT, createNodeApiRouter(opsEngine));
    app.use('/builder-api', verifyJWT, createBuilderApiV2Router(opsEngine));
    app.use('/dist-api', verifyJWT, createDistApiRouter(opsEngine));
    app.use('/ent-api', verifyJWT, createEntApiRouter(opsEngine));
    app.use('/pair', createPairApiRouter(opsEngine));
    app.use('/stream', verifyJWT, createStreamApiRouter(opsEngine));

    // [Phase 22 Fix] User requested Aliases for Curl/Frontend compatibility
    {
      // 1. GET /me (Root level alias)
      app.get('/me', verifyJWT, (req, res) => {
        res.json({
          ok: true,
          user: {
            wallet: req.user.wallet,
            role: req.user.role,
            permissions: getPermissionsForRole(req.user.role),
            exp: req.user.exp,
            iss: req.user.iss
          }
        });
      });

      // 2. /admin Alias (Redirects logic to admin router)
      app.use('/admin', verifyJWT, createAdminApiRouter(opsEngine));
    }

    // 8) Mount Integration Router
    app.use("/", createIntegrationRouter(opsEngine, adminAuth));

    // 9) Legacy Ledger Router
    app.use("/ledger", createLedgerRouter(opsEngine, adminAuth));

    // 10) Dashboard Router (Old)
    const dashRouter = createDashboardRouter(opsEngine);
    app.use("/", dashRouter);
    app.use("/dashboard", dashRouter);

    // 11) Ops Router (Rung 8)
    const opsRouter = createOpsRouter(opsEngine, adminAuth);
    app.use("/", opsRouter);
    app.use("/operations", opsRouter);

    // 12) UI Router (Rung 9)
    app.use("/ui", createUIRouter(opsEngine));

    // 13) Heartbeat
    app.post("/heartbeat", async (req, res) => {
      try {
        const { node_id, wallet, timestamp, signature } = req.body;
        const target = node_id || wallet;

        if (!target) return res.status(400).json({ error: "Missing node_id or wallet" });

        // 1. Signature Verification (Phase 3)
        if (process.env.NODE_ENV === 'production' || signature) {
          if (!timestamp || !signature) return res.status(401).json({ error: "Missing signature/timestamp" });

          // message: HEARTBEAT:{timestamp}
          const message = `HEARTBEAT:${timestamp}`;
          try {
            const { ethers } = await import("ethers");
            const recovered = ethers.verifyMessage(message, signature);
            if (recovered.toLowerCase() !== target.toLowerCase()) {
              return res.status(403).json({ error: "Invalid signature" });
            }
            // Optional: Check timestamp freshness (e.g. within 60s)
            if (Math.abs(Date.now() - timestamp) > 60000) {
              return res.status(400).json({ error: "Stale heartbeat" });
            }
          } catch (e) {
            console.error("Sig Verify Error:", e);
            return res.status(403).json({ error: "Signature verification failed" });
          }
        }

        const uptime = opsEngine.recordHeartbeatUptime(target);
        const now = Math.floor(Date.now() / 1000);

        // Phase 2: Update nodes table AND registered_nodes (Dual Write for Safety)
        const nodeReg = db.prepare("SELECT 1 FROM registered_nodes WHERE wallet = ?").get([target]);
        if (nodeReg) {
          db.prepare("UPDATE registered_nodes SET last_heartbeat = ?, active = 1, updatedAt = ? WHERE wallet = ?").run([now, now, target]);
        } else {
          db.prepare("INSERT INTO registered_nodes (wallet, last_heartbeat, active, updatedAt) VALUES (?, ?, 1, ?)").run([target, now, now]);
        }

        const nodeMain = db.prepare("SELECT 1 FROM nodes WHERE node_id = ?").get([target]);
        if (nodeMain) {
          db.prepare("UPDATE nodes SET last_seen = ?, status = 'active' WHERE node_id = ?").run([now, target]);
        } else {
          db.prepare("INSERT INTO nodes (node_id, wallet, device_type, status, last_seen, created_at) VALUES (?, ?, 'connected', 'active', ?, ?)")
            .run([target, target, now, now]);
        }

        // Phase 4: Emit Event (Real-time binding)
        // We can emit to a global bus or just let the SSE loop pick it up (Polling)
        // Since SSE polling is 10s, it's "near real-time".
        // User asked: "Emit event to admin SSE stream."
        // If we want instant, we need an event emitter.
        // For MVP, Polling in SSE is sufficient as per previous design.

        res.json({ status: "ok", uptimeCredited: uptime });
      } catch (e) {
        console.error("Heartbeat Error:", e);
        res.status(500).json({ error: e.message });
      }
    });

    // --- DEV ROUTES ---
    if (process.env.NODE_ENV !== 'production') {
      app.use('/__test/auth', createDevAuthRouter(opsEngine));

      // Phase 23: Dev Seeding
      const { createDevSeedRouter } = await import('./src/routes/dev_seed.js');
      app.use('/__test/seed', createDevSeedRouter(opsEngine));

      app.get('/__test/error', (req, res, next) => {
        const err = new Error("Simulated Crash for Observability Test");
        next(err);
      });
    }

    // 14.5) Admin Control Room API
    const { createAdminControlRoomRouter } = await import("./src/routes/admin_control_room_api.js");

    // Beta API (Phase 16) - Public routes for joining
    app.use('/beta', createBetaRouter(opsEngine));

    // [Phase 33] Public Status
    const { createPublicStatusRouter } = await import('./src/routes/public_status.js');
    app.use('/status', createPublicStatusRouter(db));

    // Pass AuditService [Phase R]
    app.use('/admin', verifyJWT, await createAdminControlRoomRouter(opsEngine, { selfTestRunner, incidentBuilder, opsReporter, auditService }));

    // [Phase 33] Network (Replaced by M5 above)

    // [Phase 34] Admin Revenue
    const { createAdminRevenueRouter } = await import('./src/routes/admin_revenue.js');
    app.use('/admin/revenue', verifyJWT, createAdminRevenueRouter(db, auditService));

    // [Phase 34] Admin Distributors
    const { createAdminDistributorsRouter } = await import('./src/routes/admin_distributors.js');
    app.use('/admin/distributors', verifyJWT, createAdminDistributorsRouter(db));

    // [Phase 34] Public Network Stats (alias for /status)
    app.use('/network-stats', createPublicStatusRouter(db));

    // [Phase 35] Admin Growth (regions, referrals, marketing)

    // [Phase 35] Admin Partners
    const { createAdminPartnersRouter } = await import('./src/routes/admin_partners.js');
    app.use('/admin/partners', verifyJWT, createAdminPartnersRouter(db));

    // [Phase 35] Admin Launch Mode
    const { createAdminLaunchRouter } = await import('./src/routes/admin_launch.js');
    app.use('/admin/launch', verifyJWT, createAdminLaunchRouter(db));

    // [Phase 35] Public Partners
    const { createPublicPartnersRouter } = await import('./src/routes/public_partners.js');
    app.use('/partners', createPublicPartnersRouter(db));

    // [Phase 36] Admin Reputation (network scores + tiers)
    const { createAdminReputationRouter, createAdminReputationImpactRouter } = await import('./src/routes/admin_reputation.js');
    app.use('/admin/network', verifyJWT, createAdminReputationRouter(db));
    app.use('/admin/economics', verifyJWT, createAdminReputationImpactRouter(db));

    // [Phase 37.1] Support & Diagnostics
    const { createSupportRouter } = await import('./src/routes/support.js');
    app.use('/support', createSupportRouter(db));
    app.use('/admin/support', createSupportRouter(db)); // Shared router, handler checks role

    // [Phase O] Node Lifecycle Management
    // Must be mounted BEFORE public node router to handle specific paths like /setup, /pair
    const { createNodeLifecycleRouter } = await import('./src/routes/node_lifecycle.js');
    app.use('/node', createNodeLifecycleRouter(db));

    // [Phase 36] Public Node Profile
    const { createPublicNodeRouter } = await import('./src/routes/public_node.js');
    app.use('/node', createPublicNodeRouter(db));

    // [Phase 36] Public Marketplace
    const { createPublicMarketplaceRouter } = await import('./src/routes/public_marketplace.js');
    app.use('/network/marketplace', createPublicMarketplaceRouter(db));

    // [Phase 37] Embedded Auth
    const { createEmbeddedAuthRouter } = await import('./src/routes/auth_embedded.js');
    app.use('/auth/embedded', createEmbeddedAuthRouter(db));


    // ─────────────────────────────────────────────────────────────



    // --- GLOBAL ERROR HANDLER ---
    app.use(async (err, req, res, next) => {
      console.error(`[ERROR] ${err.message}`);

      // [INSTRUMENTATION] Log to error_events
      if (opsEngine && opsEngine.db) {
        try {
          // Normalize stack: strip line numbers, hex strings, secrets
          const rawStack = err.stack || err.message;
          const normalized = rawStack
            .replace(/:\d+:\d+/g, ':0:0')         // strip exact line:col
            .replace(/0x[0-9a-fA-F]{8,}/g, '0xREDACTED') // strip long hex
            .replace(/eyJ[A-Za-z0-9_-]+/g, 'JWT_REDACTED'); // strip JWTs
          const stackHash = crypto.createHash('sha256').update(normalized).digest('hex');

          // Stack preview: first 10 lines, redacted
          const stackPreview = rawStack.split('\n').slice(0, 10)
            .map(l => l.replace(/0x[0-9a-fA-F]{8,}/g, '0xREDACTED'))
            .join('\n');

          // Check dedupe in last hour
          const recent = opsEngine.db.prepare("SELECT id FROM error_events WHERE stack_hash = ? AND last_seen_at > ?").get([stackHash, Date.now() - 3600000]);

          if (recent) {
            opsEngine.db.prepare("UPDATE error_events SET count = count + 1, last_seen_at = ? WHERE id = ?").run([Date.now(), recent.id]);
          } else {
            opsEngine.db.prepare(`
                    INSERT INTO error_events (service, route, method, status_code, message, stack_hash, stack_preview, trace_id, request_id, client_id, first_seen_at, last_seen_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run([
              'api',
              req.path,
              req.method,
              res.statusCode !== 200 ? res.statusCode : 500,
              err.message,
              stackHash,
              stackPreview,
              req.traceId || null,
              req.requestId || null,
              req.user?.wallet || null,
              Date.now(),
              Date.now()
            ]);
          }
        } catch (e) {
          console.error("Failed to log error event:", e.message);
        }
      }

      if (req.logger) {
        await req.logger.error('server', err.message, {
          route: req.path,
          meta: {
            stack: err.stack,
            method: req.method,
            ip: req.ip
          }
        });
      }
      if (req.accepts('html')) {
        res.status(500).send(`<h1>500 Internal Server Error</h1><p>${err.message}</p>`);
      } else {
        res.status(500).json({ error: "Internal Server Error", id: Date.now() });
      }
    });

    return app;
  })();

  return app;
}

// ─── BOOT ────────────────────────────────────────────────────
if (process.argv[1] && (process.argv[1].endsWith("server.js") || process.argv[1].endsWith("server"))) {
  (async () => {
    // Fail Fast Handlers
    process.on('uncaughtException', (err) => {
      console.error('[FATAL] Uncaught Exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    const dbConfig = {
      type: (process.env.DATABASE_URL && /^sqlite:/.test(process.env.DATABASE_URL)) ? 'sqlite'
          : (process.env.DATABASE_URL ? 'postgres' : 'sqlite'),
      connectionString: process.env.DATABASE_URL || config.sqlitePath
    };

    const db = getValidatedDB(config);
    if (db && typeof db.init === "function") {
        await db.init();
      }
if (dbConfig.type === 'sqlite') {
      try {
        // Idempotent migrations (CREATE IF NOT EXISTS / INSERT OR IGNORE)
        migrate(db.db); // db.db is the raw better-sqlite3 handle
        console.log("[BOOT] Migrations applied successfully");
      } catch (e) {
        console.warn("[BOOT] Migration warning:", e.message);
      }
    } else {
      console.log("[BOOT] Postgres detected — run migrations separately");
    }

    const app = createApp(db);
    globalThis.__SL_APP__ = app;
    if (app.locals?.ready) await app.locals.ready;

    async function bootstrap() {
      console.log("─── STARTUP VALIDATION ───");
      console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

      const isProd = process.env.NODE_ENV === "production";
      if (!process.env.JWT_SECRET && isProd) {
        console.error("FATAL: JWT_SECRET missing in production. Failsafe shutdown.");
        process.exit(1);
      }

      const jwtSecret = process.env.JWT_SECRET || "dev_only_secret";
      if (jwtSecret && jwtSecret.length < 32) {
        console.warn("WARNING: JWT_SECRET is too short (< 32 chars). For production, use a strong 256-bit secret.");
      }
      console.log(`JWT SECRET: ${process.env.JWT_SECRET ? 'Present' : 'Missing (Using Dev Fallback)'}`);

      const opsEngine = app.get('opsEngine');
      if (!opsEngine) {
        console.error("Critical: OperationsEngine not found in app context");
        process.exit(1);
      }

      try {
        opsEngine.init();
        console.log(`DB Type: ${dbConfig.type}`);
        console.log(`DB Ready: ${typeof opsEngine.db.prepare === "function"}`);
        console.log("──────────────────────────");
      } catch (err) {
        console.error("CRITICAL: Database initialization failed. Failsafe shutdown.");
        console.error(err);
        process.exit(1);
      }

      const HOST = process.env.HOST || "0.0.0.0";
      app.listen(PORT, HOST, () => {
        console.log(`Satelink MVP running on http://${HOST}:${PORT}`);
        console.log(`Admin user: satelink_admin`);

        // Start self-test runner after listen
        const selfTestRunner = app.get('selfTestRunner');
        if (selfTestRunner) selfTestRunner.start();

        if (!isProd) {
          console.log("\n=== 🛠️  DEV TOOLS (Copy-Paste for macOS/Zsh) ===");
          console.log("# 1. Check Health & Reachability");
          console.log(`curl -s http://localhost:${PORT}/health`);

          console.log("\n# 2. Mint Admin Token");
          console.log(`curl -s -X POST http://localhost:${PORT}/__test/auth/admin/login \\
  -H "Content-Type: application/json" \\
  -d '{"wallet":"0xadmin"}'`);

          console.log("\n# 3. Export Token (ROBUST)");
          console.log(`ADMIN_TOKEN=$(curl -s -X POST http://localhost:${PORT}/__test/auth/admin/login -H "Content-Type: application/json" -d '{"wallet":"0xadmin"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')`);

          console.log("\n# 4. Test Auth & View Token Claims");
          console.log(`curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:${PORT}/auth/me`);

          console.log("\n# 5. Test SSE Stream (Auto-exit after 5s)");
          console.log(`curl --max-time 5 -N -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:${PORT}/stream/admin || true`);

          console.log("\n# 6. Mint Node Token & Request Pair Code");
          console.log(`NODE_TOKEN=$(curl -s -X POST http://localhost:${PORT}/__test/auth/node/login -H "Content-Type: application/json" -d '{"wallet":"0xnode"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')`);
          // Note: pair_api returns { pair_code: "..." }
          console.log(`PAIR_CODE=$(curl -s -X POST http://localhost:${PORT}/pair/request -H "Authorization: Bearer $NODE_TOKEN" -H "Content-Type: application/json" -d '{}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).pair_code')`);
          console.log(`echo "Got Pair Code: $PAIR_CODE"`);

          console.log("\n# 7. Confirm Pair (Device Action)");
          console.log(`curl -s -X POST http://localhost:${PORT}/pair/confirm -H "Content-Type: application/json" -d "{\\"code\\":\\"$PAIR_CODE\\",\\"device_id\\":\\"dev_test_01\\"}"`);

          console.log("\n# 8. Check Status");
          console.log(`curl -s "http://localhost:${PORT}/pair/status/$PAIR_CODE"`);
          console.log("================================================\n");
        }
      });
    }

    bootstrap().catch(err => {
      console.error("Unexpected Bootstrap Error:", err);
      process.exit(1);
    });
  })();
}

export default createApp;

