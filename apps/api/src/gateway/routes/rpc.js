import express from "express";

export function createRpcRouter(db) {
  const router = express.Router();

  router.post("/:chain", async (req, res) => {
    const rpcUrl = process.env.RPC_PROVIDER_URL;
    if (!rpcUrl) {
      return res.status(503).json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: { code: -32603, message: "RPC_PROVIDER_URL not configured" }
      });
    }

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      return res.json(data);
    } catch (e) {
      console.error("[RPC] Upstream error:", e.message);
      return res.status(502).json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: { code: -32603, message: e.message }
      });
    }
  });

  return router;
}
