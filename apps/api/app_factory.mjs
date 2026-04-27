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

  // Migration endpoint: creates billing tables with EXACT source schema (remove after use)
  app.post('/admin/migrate/billing', async (req, res) => {
    if (req.headers['x-admin-secret'] !== process.env.JWT_SECRET) {
      return res.status(403).json({ error: 'forbidden' });
    }
    try {
      // Drop existing tables to fix wrong schema
      await pool.query('DROP TABLE IF EXISTS epoch_ledger CASCADE');
      await pool.query('DROP TABLE IF EXISTS revenue_events_v2 CASCADE');

      // Create revenue_events_v2 (EXACT from docker/init/init.sql)
      await pool.query(`
        CREATE TABLE revenue_events_v2 (
          id SERIAL PRIMARY KEY,
          epoch_id INTEGER,
          op_type TEXT NOT NULL,
          node_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          amount_usdt REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'success',
          request_id TEXT,
          created_at BIGINT NOT NULL,
          metadata_hash TEXT,
          price_version INTEGER DEFAULT 1,
          surge_multiplier REAL DEFAULT 1.0,
          unit_cost REAL DEFAULT 0,
          unit_count INTEGER DEFAULT 1,
          UNIQUE(client_id, op_type, request_id)
        )
      `);

      // Create epoch_ledger (EXACT from 020_epoch_ledger.sql)
      await pool.query(`
        CREATE TABLE epoch_ledger (
          id SERIAL PRIMARY KEY,
          epoch_id INTEGER UNIQUE,
          status TEXT NOT NULL DEFAULT 'OPEN',
          started_at BIGINT NOT NULL,
          closed_at BIGINT,
          total_revenue NUMERIC(18,8) DEFAULT 0,
          node_pool NUMERIC(18,8) DEFAULT 0,
          platform_fee NUMERIC(18,8) DEFAULT 0,
          distribution_pool NUMERIC(18,8) DEFAULT 0,
          merkle_root TEXT,
          tx_hash TEXT,
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
        )
      `);

      // Create indexes
      await pool.query('CREATE INDEX idx_epoch_ledger_status ON epoch_ledger (status)');
      await pool.query('CREATE INDEX idx_epoch_ledger_epoch_id ON epoch_ledger (epoch_id)');

      // Insert initial open epoch
      await pool.query(`
        INSERT INTO epoch_ledger (epoch_id, status, started_at, total_revenue)
        VALUES (1, 'OPEN', EXTRACT(EPOCH FROM NOW()), 0)
      `);

      res.json({ ok: true, tables: ['epoch_ledger', 'revenue_events_v2'] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}
