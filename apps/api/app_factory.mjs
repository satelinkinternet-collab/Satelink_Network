import "./src/core/config/dotenv_boot.js";
import express from "express";
import { attachBaseMiddleware } from "./src/security/middleware.js";
import { attachSchema } from "./src/core/schema.js";
import { attachSecurity } from "./src/security/security.js";
import { attachHeartbeat, startHeartbeatWatchdog } from "./src/nodes/heartbeat.js";
import { attachRoutes } from "./src/gateway/routes.js";
import { attachUI } from "./src/gateway/ui.js";
import { EconomicLedger } from "./src/economics/economic_ledger.js";
import { OperationsEngine } from "./src/core/operations_engine.js";

// Minimal stubs for missing settlement engine components (Post-Merge Fix)
class AdapterRegistry {
  constructor() { this.adapters = new Map(); }
  register(adapter) { this.adapters.set(adapter?.name || adapter?.constructor?.name, adapter); }
  get(name) { return this.adapters.get(name); }
}

class SettlementEngine {
  constructor(db, ledger, registry, opts) {
    this.db = db;
    this.ledger = ledger;
    this.registry = registry;
    this.opts = opts;
  }
}

class SimulatedAdapter { name = 'SimulatedAdapter'; }
class ShadowAdapter { name = 'ShadowAdapter'; }

export async function createApp(db) {
  const app = express();
  const ledger = new EconomicLedger(db);
  const opsEngine = new OperationsEngine(db, null, null);

  // Attach modules in same order as server.js
  attachBaseMiddleware(app);
  await attachSchema(db);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  attachRoutes(app, db, { ledger, opsEngine });
  attachUI(app, db);

  // ── Settlement Engine Initialization ──
  // Register adapters and wire the settlement engine so admin routes
  // (req.app.get('settlementEngine')) resolve to a live instance.
  const adapterRegistry = new AdapterRegistry();
  adapterRegistry.register(new SimulatedAdapter());
  adapterRegistry.register(new ShadowAdapter());

  // EvmAdapter requires RPC keys and is registered conditionally
  if (process.env.SETTLEMENT_EVM_RPC_URL) {
    import("./src/settlement/adapters/EvmAdapter.js").then(({ EvmAdapter }) => {
      adapterRegistry.register(new EvmAdapter(db));
      console.log("[SettlementEngine] EvmAdapter registered (live EVM settlement available)");
    }).catch(err => {
      console.warn("[SettlementEngine] EvmAdapter failed to load:", err.message);
    });
  }

  // PolygonUsdtAdapter — primary chain. Registered when Polygon env is present.
  if (process.env.POLYGON_RPC_URL && process.env.POLYGON_USDT_ADDRESS) {
    import("./src/settlement/adapters/PolygonUsdtAdapter.js").then(({ PolygonUsdtAdapter }) => {
      adapterRegistry.register(new PolygonUsdtAdapter());
      console.log("[SettlementEngine] PolygonUsdtAdapter registered (primary settlement chain)");
    }).catch(err => {
      console.warn("[SettlementEngine] PolygonUsdtAdapter failed to load:", err.message);
    });
  }

  // FuseUsdtAdapter — deprecated, only register if explicitly configured.
    import("./src/settlement/adapters/FuseUsdtAdapter.js").then(({ FuseUsdtAdapter }) => {
      adapterRegistry.register(new FuseUsdtAdapter());
      console.warn("[SettlementEngine] FuseUsdtAdapter registered (DEPRECATED — prefer Polygon)");
    }).catch(err => {
      console.warn("[SettlementEngine] FuseUsdtAdapter failed to load:", err.message);
    });
  }

  const settlementEngine = new SettlementEngine(db, null, adapterRegistry, {});
  app.set('settlementEngine', settlementEngine);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error("[SERVER] Unhandled Exception:", err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
    // Ensure API endpoints consistently return JSON
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  });

  return app;
}

export default createApp;
