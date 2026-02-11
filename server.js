
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import "dotenv/config";

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
import { AlertService } from "./src/ops/alerts.js";
import { Scheduler } from "./src/ops/scheduler.js";

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
  // await opsEngine.seed(); // [FIX] Moved to bootstrap/init to ensure DB ready
  const adminAuth = createAdminAuth(opsEngine);

  // Automation
  const scheduler = new Scheduler(opsEngine, alertService);
  scheduler.start();

  // 3) Express Setup
  const app = express();
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

  // 7) Healthz (root level, always works)
  app.get("/healthz", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));



  // 14) Builder Routes (Rung 10b) - Moved to top to avoid 404 interference
  console.log(`[INIT] Builder Auth - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  const builderAuthRouter = createBuilderAuthRouter(opsEngine);
  app.use('/', builderAuthRouter);

  const builderApiRouter = createBuilderApiRouter(opsEngine, builderAuthRouter.requireAuth);
  app.use('/builder', builderApiRouter);

  const usageIngestRouter = createUsageIngestRouter(opsEngine);
  app.use('/v1/builder', usageIngestRouter);

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
      const { nodeWallet } = req.body || {};
      if (!nodeWallet) return res.status(400).json({ error: "Missing nodeWallet" });
      const uptime = await opsEngine.recordHeartbeatUptime(nodeWallet);
      const now = Math.floor(Date.now() / 1000);

      // Upsert registration
      const node = await db.get("SELECT 1 FROM registered_nodes WHERE wallet = ?", [nodeWallet]);
      if (node) {
        await db.query("UPDATE registered_nodes SET last_heartbeat = ?, active = 1, updatedAt = ? WHERE wallet = ?", [now, now, nodeWallet]);
      } else {
        await db.query("INSERT INTO registered_nodes (wallet, last_heartbeat, active, updatedAt) VALUES (?, ?, 1, ?)", [nodeWallet, now, now]);
      }

      res.json({ status: "ok", uptimeCredited: uptime });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // --- DEV ROUTES ---
  if (process.env.NODE_ENV !== 'production') {
    app.get('/__test/error', (req, res, next) => {
      const err = new Error("Simulated Crash for Observability Test");
      next(err);
    });
  }

  // --- GLOBAL ERROR HANDLER ---
  app.use(async (err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);
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
    const dbConfig = {
      type: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
      connectionString: process.env.DATABASE_URL || config.sqlitePath
    };

    const db = new UniversalDB(dbConfig);

    if (process.env.RUN_MIGRATIONS === 'true') {
      // TODO: Async migration logic
      console.log("Migrations skipped in server boot. Use scripts/migrate.js");
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

      app.listen(PORT, () => {
        console.log(`Satelink MVP running on port ${PORT}`);
        console.log(`Admin user: satelink_admin`);
      });
    }

    bootstrap().catch(err => {
      console.error("Unexpected Bootstrap Error:", err);
      process.exit(1);
    });
  })();
}

export default createApp;
