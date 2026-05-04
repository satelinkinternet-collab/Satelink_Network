import { Router } from "express";
import { DemandBuffer } from "../../queue/demand_buffer.js";
import { CompatibilityGateway } from "../../gateway/compatibility_gateway.js";
import { routeRpcRequest } from "../../workloads/rpc_gateway/router.js";

export function createCompatibilityGatewayRoutes(demandBuffer) {
  const buffer = demandBuffer ?? new DemandBuffer();
  const gateway = new CompatibilityGateway(buffer);

  const workloadRouter = Router();

  // ✅ FIXED RPC ROUTE
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

  // legacy ETH
  workloadRouter.post("/eth", (req, res) => {
    const clientId = req.headers["x-client-id"] || req.ip || "anonymous";
    const result = gateway.handleEthRpc(req.body, clientId);
    res.status(result.code ?? (result.ok ? 200 : 400)).json(result);
  });

  const adminRouter = Router();

  adminRouter.get("/stats", (req, res) => {
    res.status(200).json({ ok: true, ...gateway.getStats() });
  });

  adminRouter.get("/clients", (req, res) => {
    res.status(200).json({ ok: true, clients: gateway.getClients() });
  });

  return { workloadRouter, adminRouter, gateway };
}
