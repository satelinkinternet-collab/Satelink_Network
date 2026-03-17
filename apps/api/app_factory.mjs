import "dotenv/config";
import express from "express";
import { attachBaseMiddleware } from "./src/security/middleware.js";
import { attachSchema } from "./src/core/schema.js";
import { attachSecurity } from "./src/security/security.js";
import { attachHeartbeat } from "./src/nodes/heartbeat.js";
import { attachRoutes } from "./src/gateway/routes.js";
import { attachUI } from "./src/gateway/ui.js";
import { SettlementEngine } from "./src/settlement/settlement_engine.js";
import { AdapterRegistry } from "./src/settlement/adapter_registry.js";
import { SimulatedAdapter } from "./src/settlement/adapters/SimulatedAdapter.js";
import { ShadowAdapter } from "./src/settlement/adapters/ShadowAdapter.js";

export function createApp(db) {
  const app = express();

  // Attach modules in same order as server.js
  attachBaseMiddleware(app);
  attachSchema(db);
  attachSecurity(app, db);
  attachHeartbeat(app, db);
  attachRoutes(app, db);
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
