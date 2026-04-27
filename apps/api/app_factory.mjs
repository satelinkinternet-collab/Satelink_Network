import express from "express";
import revenueRoutes from "./src/routes/revenue.js";
import { createRpcGateway } from "./src/workloads/rpc_gateway/rpc_gateway.js";
import { createMevRelayRouter } from "./src/workloads/mev_relay/index.js";
import { createAiGatewayRouter } from "./src/workloads/ai_gateway/index.js";
import { createLangChainAdapterRouter } from "./src/workloads/ai_gateway/langchain_adapter.js";
import { createPluginManifestRouter, createOpenApiRouter } from "./src/workloads/ai_gateway/plugin_manifest.js";
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

  // MEV Private Relay (S3-001) — 10x pricing, requires API key
  app.use("/rpc/mev", createMevRelayRouter(pool, redis));

  // AI Inference Gateway (S3-002) — OpenAI-compatible, per-token billing
  app.use("/v1", createAiGatewayRouter(pool, redis));

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

  // Debug: check actual schema on Railway (remove after debugging)
  app.get('/admin/debug/schema', async (req, res) => {
    if (req.headers['x-admin-secret'] !== process.env.JWT_SECRET) {
      return res.status(403).end();
    }
    try {
      const r = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'revenue_events_v2'
        ORDER BY ordinal_position
      `);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // One-time migration endpoint (remove after use)
  app.post('/admin/migrate/epoch-ledger', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.JWT_SECRET) {
      return res.status(403).json({ error: 'forbidden' });
    }
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS epoch_ledger (
          id SERIAL PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'OPEN',
          started_at BIGINT NOT NULL,
          closed_at BIGINT,
          total_revenue NUMERIC(18,8) DEFAULT 0,
          node_pool NUMERIC(18,8) DEFAULT 0,
          platform_fee NUMERIC(18,8) DEFAULT 0,
          distribution_pool NUMERIC(18,8) DEFAULT 0,
          merkle_root TEXT,
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
        )
      `);
      await pool.query(`
        INSERT INTO epoch_ledger (status, started_at, total_revenue)
        SELECT 'OPEN', EXTRACT(EPOCH FROM NOW()) * 1000, 0
        WHERE NOT EXISTS (SELECT 1 FROM epoch_ledger WHERE status = 'OPEN')
      `);
      res.json({ ok: true, message: 'epoch_ledger created and first epoch opened' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}
