import express from "express";
import revenueRoutes from "./src/routes/revenue.js";
import { createRpcGateway } from "./src/workloads/rpc_gateway/rpc_gateway.js";
import { createMevRelayRouter } from "./src/workloads/mev_relay/index.js";
import { createAiGatewayRouter } from "./src/workloads/ai_gateway/index.js";
import { createLangChainAdapterRouter } from "./src/workloads/ai_gateway/langchain_adapter.js";
import { createPluginManifestRouter, createOpenApiRouter } from "./src/workloads/ai_gateway/plugin_manifest.js";
import { createApiKeysRouter } from "./src/gateway/routes/api_keys.js";
import { createNodeRegistryRouter } from "./src/services/node_registry/registration.js";
import { createSdkAnalyticsRouter } from "./src/workloads/rpc_gateway/sdk_analytics.js";

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

  // MEV Private Relay (S3-001) — 10x pricing, requires API key
  app.use("/rpc/mev", createMevRelayRouter(pool, redis));

  // AI Inference Gateway (S3-002) — OpenAI-compatible, per-token billing
  app.use("/v1", createAiGatewayRouter(pool, redis));

  const { createBandwidthRouter } = await import("./src/workloads/bandwidth_proxy/index.js");
  app.use("/api/bandwidth", createBandwidthRouter(pool, redis));
  // LangChain Tool Adapter (S3-004) — AI agent tool definitions
  app.use("/v1/tools", createLangChainAdapterRouter(pool, redis));

  // OpenAI Plugin Manifest (S3-005) — AI ecosystem integration
  app.use("/.well-known", createPluginManifestRouter());
  app.use("/openapi.json", createOpenApiRouter());

  // API Key management
  app.use("/api/keys", createApiKeysRouter(pool));

  // Revenue API routes
  app.use("/api", revenueRoutes(pool));

  // Node Registry (S2-001)
  app.use("/api/nodes", createNodeRegistryRouter(pool, redis));

  // SDK Analytics (S4-005)
  app.use("/api", createSdkAnalyticsRouter());

  return app;
}
