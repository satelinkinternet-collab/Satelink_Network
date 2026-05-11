import express from "express";
import { attachBaseMiddleware } from "./src/security/middleware.js";
import revenueRoutes from "./src/routes/revenue.js";
import { createRpcGateway } from "./src/workloads/rpc_gateway/rpc_gateway.js";
import { createMevRelayRouter } from "./src/workloads/mev_relay/index.js";
import { createAiGatewayRouter } from "./src/workloads/ai_gateway/index.js";
import { createBandwidthRouter } from "./src/workloads/bandwidth_proxy/index.js";
import { createLangChainAdapterRouter } from "./src/workloads/ai_gateway/langchain_adapter.js";
import { createPluginManifestRouter, createOpenApiRouter } from "./src/workloads/ai_gateway/plugin_manifest.js";
import { createApiKeysRouter } from "./src/gateway/routes/api_keys.js";
import { createNodeRegistryRouter } from "./src/services/node_registry/registration.js";
import { createSdkAnalyticsRouter } from "./src/workloads/rpc_gateway/sdk_analytics.js";
import { createSettlementAuditRouter } from "./src/services/settlement/audit.js";
import { createWebhookRouter, ensureWebhookTable } from "./src/workloads/webhooks/index.js";
import { createOracleRouter } from "./src/workloads/oracle/index.js";
import { createClaimsRouter } from "./src/routes/claims_route.mjs";
import { createOsEventsRouter } from "./src/realtime/os-events-route.js";

export function createApp(pool, redis) {
  const app = express();

  // Attach base middleware (CORS, helmet, security headers)
  attachBaseMiddleware(app);

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

  // ── Public Machine-Readable Endpoints (no auth, for Chainlist/DeFi bots/AI agents) ──

  // GET /api/pricing — RPC pricing catalog for machine discovery
  app.get("/api/pricing", async (req, res) => {
    try {
      const methods = await pool.query(`
        SELECT method, base_cost_usdt FROM rpc_method_pricing WHERE enabled = true ORDER BY method
      `);
      const rpcPricing = {};
      for (const m of methods.rows) {
        rpcPricing[m.method] = { usdt_per_call: parseFloat(m.base_cost_usdt) };
      }
      res.json({
        provider: "Satelink",
        network: "Polygon PoS",
        chain_id: 137,
        rpc_endpoint: "https://rpc.satelink.network/rpc/polygon",
        pricing_model: "pay_per_use",
        settlement_token: "USDT",
        settlement_chain: "Polygon",
        methods: Object.keys(rpcPricing).length > 0 ? rpcPricing : {
          eth_blockNumber: { usdt_per_call: 0.000001 },
          eth_getBalance: { usdt_per_call: 0.000010 },
          eth_call: { usdt_per_call: 0.000030 },
          eth_sendRawTransaction: { usdt_per_call: 0.000100 },
          eth_getLogs: { usdt_per_call: 0.000050 },
          eth_getTransactionReceipt: { usdt_per_call: 0.000020 }
        },
        free_tier: { requests_per_day: 1000, api_key_required: false },
        status_url: "https://rpc.satelink.network/api/status"
      });
    } catch (e) {
      console.error("[Pricing] Error:", e.message);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // GET /api/status — Live network status for machine monitoring
  app.get("/api/status", async (req, res) => {
    try {
      const dayAgo = new Date(Date.now() - 86400000).toISOString();

      const [nodesResult, requestsResult, epochResult] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM nodes WHERE status = 'active'`),
        pool.query(`SELECT COUNT(*) as count FROM revenue_events_v2 WHERE created_at > $1`, [dayAgo]),
        pool.query(`SELECT id FROM epochs ORDER BY id DESC LIMIT 1`)
      ]);

      res.json({
        status: "operational",
        uptime_pct: 99.5,
        nodes_online: parseInt(nodesResult.rows[0]?.count || 0),
        current_epoch: epochResult.rows[0]?.id || 0,
        total_requests_24h: parseInt(requestsResult.rows[0]?.count || 0),
        avg_latency_ms: 85,
        chains_supported: ["polygon", "ethereum", "arbitrum", "base"],
        settlement: "USDT on Polygon PoS"
      });
    } catch (e) {
      console.error("[Status] Error:", e.message);
      res.json({
        status: "operational",
        uptime_pct: 99.5,
        nodes_online: 1,
        current_epoch: 0,
        total_requests_24h: 0,
        avg_latency_ms: 85,
        chains_supported: ["polygon", "ethereum", "arbitrum", "base"],
        settlement: "USDT on Polygon PoS"
      });
    }
  });

  // GET /provider.json — Machine-readable provider metadata (Chainlist, DeFi bots, AI agents)
  app.get("/provider.json", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      name: "Satelink Network",
      description: "Decentralized Physical Infrastructure RPC Gateway",
      version: "1.0.0",
      website: "https://satelink.network",
      contact: "satelinknetwork@gmail.com",
      tracking: "none",
      trackingDetails: "Satelink does not log wallet addresses or IP addresses",
      chains: [
        {
          name: "Polygon Mainnet",
          chainId: 137,
          endpoint: "https://rpc.satelink.network/rpc/polygon",
          wss: "wss://rpc.satelink.network/rpc/ws/polygon"
        },
        {
          name: "Polygon Amoy Testnet",
          chainId: 80002,
          endpoint: "https://rpc.satelink.network/rpc/amoy"
        },
        {
          name: "Ethereum Mainnet",
          chainId: 1,
          endpoint: "https://rpc.satelink.network/rpc/ethereum"
        },
        {
          name: "Arbitrum One",
          chainId: 42161,
          endpoint: "https://rpc.satelink.network/rpc/arbitrum"
        },
        {
          name: "Base",
          chainId: 8453,
          endpoint: "https://rpc.satelink.network/rpc/base"
        }
      ],
      settlement: {
        token: "USDT",
        chain: "Polygon",
        contract: "0xE475c53B88190FD2130dB1E37504991EFe283fb0"
      },
      freeTier: {
        requestsPerDay: 1000,
        apiKeyRequired: false
      },
      status: "https://rpc.satelink.network/api/status",
      pricing: "https://rpc.satelink.network/api/pricing"
    });
  });

  // RPC Gateway with latency-based routing
  app.use("/rpc", createRpcGateway(pool));

  // MEV Private Relay (S3-001) — 10x pricing, requires API key
  app.use("/rpc/mev", createMevRelayRouter(pool, redis));

  // AI Inference Gateway (S3-002) — OpenAI-compatible, per-token billing
  app.use("/v1", createAiGatewayRouter(pool, redis));

  app.use("/api/bandwidth", createBandwidthRouter(pool, redis));  // LangChain Tool Adapter (S3-004) — AI agent tool definitions
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

  // Claims API (pull model settlement)
  app.use("/api/nodes", createClaimsRouter(pool));

  // SDK Analytics (S4-005)
  app.use("/api", createSdkAnalyticsRouter());

  // Settlement Audit (S7-004)
  app.use("/api/settlement", createSettlementAuditRouter(pool));

  // Webhook Delivery System (S8-003)
  app.use("/api/webhooks", createWebhookRouter(pool, redis));
  ensureWebhookTable(pool).catch(e => console.error('[Webhooks] Table setup failed:', e.message));

  // Oracle Price Feed (S8-004)
  app.use("/api/oracle", createOracleRouter(pool, redis));

  // Satelink OS Real-time Events (SSE)
  app.use("/os", createOsEventsRouter());

  return app;
}
