import express from "express";
import revenueRoutes from "./src/routes/revenue.js";
import { createRpcGateway } from "./src/workloads/rpc_gateway/rpc_gateway.js";
import { createApiKeysRouter } from "./src/gateway/routes/api_keys.js";
import { createNodeRegistryRouter } from "./src/services/node_registry/registration.js";

export function createApp(pool, redis) {
  const app = express();

  app.use(express.json());

  // Core endpoints
  app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/mode", (req, res) => {
    res.status(200).json({
      ok: true,
      mode: process.env.SATELINK_MODE || "simulation",
      env: process.env.NODE_ENV || "development"
    });
  });

  app.get("/api/runtime-info", (req, res) => {
    res.status(200).json({ ok: true, version: "1.0.0", uptime: process.uptime() });
  });

  app.get("/simulation/status", (req, res) => res.status(200).json({ ok: true, mode: "simulation", active: true }));

  // RPC Gateway with latency-based routing
  app.use("/rpc", createRpcGateway(pool));

  // API Key management
  app.use("/api/keys", createApiKeysRouter(pool));

  // Revenue API routes
  app.use("/api", revenueRoutes(pool));

  // Node Registry (S2-001)
  app.use("/api/nodes", createNodeRegistryRouter(pool, redis));

  return app;
}
