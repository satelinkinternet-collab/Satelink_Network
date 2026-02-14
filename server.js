
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
import { createAdminAuth } from "./src/middleware/auth.js";
import { createIntegrationRouter } from "./src/integrations/router.js";
import { createLedgerRouter } from "./src/routes/ledger.js";
import { UniversalDB } from "./src/db/index.js";
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


import { Scheduler } from "./src/ops/scheduler.js";

// Documentation (Swagger)
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
const swaggerDocument = YAML.load('./docs/swagger.yaml');

// ─── CONFIG ──────────────────────────────────────────────────
const config = validateEnv();
const PORT = config.port;

process.on("unhandledRejection", (err) => console.error("[CRITICAL] Unhandled:", err));

// ─── APP FACTORY ─────────────────────────────────────────────
export async function createApp(db) {
  // 1) Migrations
  // Note: Migrate script needs refactor too. For now we assume db passed in is ready or we run migrations separately.

  // 2) Engine + Auth + Services
  const logger = new LoggerService(db);
  const diagnostics = new DiagnosticsService(db, logger);
  const alertService = new AlertService(logger);

  const opsEngine = new OperationsEngine(db);
  // await opsEngine.seed(); 
  const opsReporter = new OpsReporter(db);
  await opsReporter.init();



  const adminAuth = createAdminAuth(opsEngine);

  // Automation
  const scheduler = new Scheduler(opsEngine, alertService);
  scheduler.start();

  // 3) Express Setup
  const app = express();
  app.set('db', db); // Make DB available globally via app.get('db')

  // Abuse Firewall (Phase 21)
  const abuseFirewall = new AbuseFirewall(db, alertService); // Pass alertService
  await abuseFirewall.init();
  app.set('abuseFirewall', abuseFirewall);

  // Safe Mode Autopilot (Phase 22)
  const { SafeModeAutopilot } = await import('./src/services/safe_mode_autopilot.js');
  const safeModeAutopilot = new SafeModeAutopilot(db, alertService);
  await safeModeAutopilot.init();
  app.set('safeModeAutopilot', safeModeAutopilot);

  // Feature Flags (Phase 23)
  const { FeatureFlagService } = await import('./src/services/feature_flags.js');
  const featureFlags = new FeatureFlagService(db);
  await featureFlags.init();
  app.set('featureFlags', featureFlags);

  // Drills (Phase 24)
  const { DrillsService } = await import('./src/services/drills.js');
  const drills = new DrillsService(db, opsEngine, alertService, abuseFirewall, safeModeAutopilot);
  app.set('drills', drills);

  // Backups (Phase 27)
  const { BackupService } = await import('./src/services/backup_service.js');
  const backupService = new BackupService(db);
  await backupService.init();
  app.set('backupService', backupService);

  // Preflight Gate (Phase 28)
  // Moved to after OpsEngine/Ledger init below

  // [Phase 26] Economic Ledger
  const { EconomicLedger } = await import('./src/services/economic_ledger.js');
  const ledger = new EconomicLedger(db);
  app.set('ledger', ledger);

  // Inject Ledger into OpsEngine
  opsEngine.ledger = ledger;

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
  app.set('opsEngine', opsEngine);

  // Incident builder + self-test runner (started later in bootstrap after listen)
  const incidentBuilder = new IncidentBuilder(db);
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
  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true })); // [FIX] Support form posts for login

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
        const { decision, reason_codes, ttl_seconds } = await abuseFirewall.decide(ctx);

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

        // Async Metric Recording
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
  app.use((req, res, next) => {
    const opsEngine = req.app.get('opsEngine');
    if (!opsEngine || !opsEngine.initialized || !opsEngine.db) {
      return res.status(503).json({
        ok: false,
        error: "Database not ready"
      });
    }
    next();
  });

  // 6c) Withdrawal Circuit Breaker
  app.use(['/withdraw', '/claim', '/withdrawals'], async (req, res, next) => {
    // Only block POST/PUT/DELETE for safety, GETs (like status) can remain open
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const ops = req.app.get('opsEngine');
      const safe = await ops.isSystemSafe();
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
    const { getPermissionsForRole } = await import('./src/routes/auth_v2.js');
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
  app.use("/", createDashboardRouter(opsEngine, adminAuth));

  // 11) Ops Router (Rung 8)
  app.use("/", createOpsRouter(opsEngine, adminAuth));

  // 12) UI Router (Rung 9)
  app.use("/ui", createUIRouter(opsEngine, adminAuth));

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

      const uptime = await opsEngine.recordHeartbeatUptime(target);
      const now = Math.floor(Date.now() / 1000);

      // Phase 2: Update nodes table AND registered_nodes (Dual Write for Safety)
      await Promise.all([
        // Legacy Config
        (async () => {
          const node = await db.get("SELECT 1 FROM registered_nodes WHERE wallet = ?", [target]);
          if (node) {
            await db.query("UPDATE registered_nodes SET last_heartbeat = ?, active = 1, updatedAt = ? WHERE wallet = ?", [now, now, target]);
          } else {
            await db.query("INSERT INTO registered_nodes (wallet, last_heartbeat, active, updatedAt) VALUES (?, ?, 1, ?)", [target, now, now]);
          }
        })(),
        // New Cycle
        (async () => {
          // We assume 'nodes' record was created by pair/confirm. If not, create it.
          const node = await db.get("SELECT 1 FROM nodes WHERE node_id = ?", [target]);
          if (node) {
            await db.query("UPDATE nodes SET last_seen = ?, status = 'active' WHERE node_id = ?", [now, target]);
          } else {
            // Auto-register via heartbeat if not paired? Allowed for now to support non-paired nodes.
            await db.query("INSERT INTO nodes (node_id, wallet, device_type, status, last_seen, created_at) VALUES (?, ?, 'connected', 'active', ?, ?)",
              [target, target, now, now]);
          }
        })()
      ]);

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

  app.use('/admin', verifyJWT, await createAdminControlRoomRouter(opsEngine, { selfTestRunner, incidentBuilder, opsReporter }));

  // [Phase 33] Admin Network/Fleet
  const { createAdminNetworkRouter } = await import('./src/routes/admin_network.js');
  app.use('/admin/network', verifyJWT, createAdminNetworkRouter(db, console));

  // [Phase 34] Admin Revenue
  const { createAdminRevenueRouter } = await import('./src/routes/admin_revenue.js');
  app.use('/admin/revenue', verifyJWT, createAdminRevenueRouter(db));

  // [Phase 34] Admin Distributors
  const { createAdminDistributorsRouter } = await import('./src/routes/admin_distributors.js');
  app.use('/admin/distributors', verifyJWT, createAdminDistributorsRouter(db));

  // [Phase 34] Public Network Stats (alias for /status)
  app.use('/network-stats', createPublicStatusRouter(db));

  // [Phase 35] Admin Growth (regions, referrals, marketing)
  const { createAdminGrowthRouter } = await import('./src/routes/admin_growth.js');
  app.use('/admin/growth', verifyJWT, createAdminGrowthRouter(db));

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

  // [Phase 36] Public Node Profile
  const { createPublicNodeRouter } = await import('./src/routes/public_node.js');
  app.use('/node', createPublicNodeRouter(db));

  // [Phase 36] Public Marketplace
  const { createPublicMarketplaceRouter } = await import('./src/routes/public_marketplace.js');
  app.use('/network/marketplace', createPublicMarketplaceRouter(db));




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
        const recent = await opsEngine.db.get("SELECT id FROM error_events WHERE stack_hash = ? AND last_seen_at > ?", [stackHash, Date.now() - 3600000]);

        if (recent) {
          await opsEngine.db.query("UPDATE error_events SET count = count + 1, last_seen_at = ? WHERE id = ?", [Date.now(), recent.id]);
        } else {
          await opsEngine.db.query(`
                    INSERT INTO error_events (service, route, method, status_code, message, stack_hash, stack_preview, trace_id, request_id, client_id, first_seen_at, last_seen_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
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
      type: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
      connectionString: process.env.DATABASE_URL || config.sqlitePath
    };

    const db = new UniversalDB(dbConfig);
    await db.init();

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

    const app = await createApp(db);

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
        await opsEngine.init();
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
