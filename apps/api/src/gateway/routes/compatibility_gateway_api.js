/**
 * Compatibility Gateway HTTP Routes
 *
 * Mounts:
 *   POST /rpc/:chain            → Multi-chain JSON-RPC (uses routeRpcRequest)
 *   POST /compute/job           → Generic compute jobs
 *   POST /webhook/execute       → Webhook event processing
 *   GET  /admin/gateway/stats   → Engine stats
 *   GET  /admin/gateway/clients → Per-client request summary
 *   POST /admin/gateway/pause   → Pause gateway
 *   POST /admin/gateway/resume  → Resume gateway
 *
 * Returns { workloadRouter, adminRouter, gateway } so callers can mount
 * the two routers at different path prefixes and retain the gateway instance.
 */

import { Router } from "express";
import { DemandBuffer } from "../../queue/demand_buffer.js";
import { CompatibilityGateway } from "../../gateway/compatibility_gateway.js";
import { routeRpcRequest } from "../../workloads/rpc_gateway/router.js";

/**
 * @param {DemandBuffer}           [demandBuffer]  — supply existing buffer or create new
 * @returns {{ workloadRouter, adminRouter, gateway }}
 */
export function createCompatibilityGatewayRoutes(demandBuffer) {
  const buffer = demandBuffer ?? new DemandBuffer();
  const gateway = new CompatibilityGateway(buffer);

  // ── Workload routers ──────────────────────────────────────────────────────
  const workloadRouter = Router();

  // POST /rpc/:chain — Multi-chain JSON-RPC gateway
  workloadRouter.post("/:chain", async (req, res) => {
    const { chain } = req.params;
    const { method, params, id } = req.body;

    console.log(`[RPC ENTRY] ${chain} → ${method} (id: ${id})`);

    if (!method) {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32600, message: "Invalid Request: method required" },
      });
    }

    try {
      const routeResult = await routeRpcRequest(
        chain,
        method,
        params ?? [],
        id,
      );

      if (!routeResult.success) {
        return res.status(502).json({
          jsonrpc: "2.0",
          id: id ?? null,
          error: { code: -32603, message: routeResult.error },
        });
      }

      res.status(200).json(routeResult.result);
    } catch (error) {
      console.error("[RPC ENTRY] Error:", error.message);
      res.status(500).json({
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32603, message: "Internal error" },
      });
    }
  });

  // POST /rpc/eth (legacy)
  workloadRouter.post("/eth", (req, res) => {
    const clientId = req.headers["x-client-id"] || req.ip || "anonymous";
    const result = gateway.handleEthRpc(req.body, clientId);
    res.status(result.code ?? (result.ok ? 200 : 400)).json(result);
  });

  // POST /compute/job
  const computeRouter = Router();
  computeRouter.post("/job", (req, res) => {
    const clientId = req.headers["x-client-id"] || req.ip || "anonymous";
    const result = gateway.handleComputeJob(req.body, clientId);
    res.status(result.code ?? (result.ok ? 200 : 400)).json(result);
  });

  // POST /webhook/execute
  const webhookRouter = Router();
  webhookRouter.post("/execute", (req, res) => {
    const clientId = req.headers["x-client-id"] || req.ip || "anonymous";
    const result = gateway.handleWebhook(req.body, clientId);
    res.status(result.code ?? (result.ok ? 200 : 400)).json(result);
  });

  // ── Admin router ──────────────────────────────────────────────────────────
  const adminRouter = Router();

  adminRouter.get("/stats", (req, res) => {
    res.status(200).json({ ok: true, ...gateway.getStats() });
  });

  adminRouter.get("/clients", (req, res) => {
    res.status(200).json({ ok: true, clients: gateway.getClients() });
  });

  adminRouter.post("/pause", (req, res) => {
    gateway.pause();
    res.status(200).json({ ok: true, paused: true });
  });

  adminRouter.post("/resume", (req, res) => {
    gateway.resume();
    res.status(200).json({ ok: true, paused: false });
  });

  return { workloadRouter, computeRouter, webhookRouter, adminRouter, gateway };
}

import { routeRpcRequest } from "../../workloads/rpc_gateway/router.js";

app.post("/rpc/:chain", async (req, res) => {
  const { chain } = req.params;
  const { method, params, id } = req.body;

  console.log("[RPC ENTRY]", chain, method);

  const result = await routeRpcRequest(chain, method, params, id);

  if (result.success) {
    return res.json(result.result);
  }

  return res.status(500).json({
    error: result.error,
    attempted: result.attemptedProviders,
  });
});


/* === FORCE RPC ROUTE INJECTION === */
export function __forceRpcRoute(app) {
  app.post('/rpc/:chain', async (req, res) => {
    const { chain } = req.params;
    const { method, params, id } = req.body;

    console.log('[RPC ENTRY]', chain, method);

    const result = await routeRpcRequest(chain, method, params, id);

    if (result.success) {
      return res.json(result.result);
    }

    return res.status(500).json({
      error: result.error,
      attempted: result.attemptedProviders
    });
  });
}
