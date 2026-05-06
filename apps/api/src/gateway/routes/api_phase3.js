import { Router } from "express";
import { RevenueOracle } from "../../economics/revenue_oracle.js";
import { TreasuryMonitor } from "../../monitoring/treasury_monitor.js";
import fuseService from "../../security/fuse.js";
import { requireJWT, requireRole } from "../../security/auth_middleware.js";
import {
  executeWithdrawal,
  withdrawRateLimitMiddleware,
} from "../../settlement/withdraw_service.js";

export function createPhase3Router(db, opsEngine) {
  const router = Router();
  const oracle = new RevenueOracle(fuseService, db);
  const treasury = new TreasuryMonitor(fuseService, db);

  // ===============================
  // TREASURY STATUS
  // ===============================
  router.get("/treasury/status", async (req, res) => {
    try {
      const latest = treasury.getLatestSnapshot();
      if (latest) {
        res.json({ ok: true, data: latest });
      } else {
        const snapshot = await treasury.captureSnapshot();
        res.json({ ok: true, data: snapshot });
      }
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: "Failed to fetch treasury status",
      });
    }
  });

  // ===============================
  // SETTLEMENT MODE
  // ===============================
  router.get("/services/settlement/mode", (req, res) => {
    res.json({
      ok: true,
      data: {
        mode:
          process.env.FEATURE_REAL_SETTLEMENT === "true" ? "EVM" : "SIMULATED",
        chainName: "Fuse (Testnet)",
        contractAddress: process.env.REVENUE_VAULT_CONTRACT || "0x...",
      },
    });
  });

  // ===============================
  // AUTH (kept but not enforced now)
  // ===============================
  const requireAuth = [requireJWT, requireRole("node_operator")];

  // ===============================
  // CLAIM
  // ===============================
  router.post("/node/me/claim", async (req, res) => {
    try {
      const { epochId } = req.body;

      const wallet =
        req.user?.wallet || "0xfad15978a7219ef2abdb71fabf53d29045e6b723";

      if (epochId === undefined) {
        return res.status(400).json({
          ok: false,
          error: "epochId is required",
        });
      }

      const claimData = oracle.getClaimData(epochId, wallet);

      if (!claimData) {
        return res.status(404).json({
          ok: false,
          error: "No claim entitlement found",
        });
      }

      res.json({
        ok: true,
        claim: {
          epochId,
          amount: claimData.amount_usdt,
          proof: claimData.proof,
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  // ===============================
  // WITHDRAW (FIXED CORE)
  // ===============================
  router.post("/node/me/withdraw", async (req, res) => {
    try {
      const { amount } = req.body;

      const wallet =
        req.user?.wallet || "0xfad15978a7219ef2abdb71fabf53d29045e6b723";

      // 🔥 REAL EXECUTION (mock opsEngine for now)
      const result = await executeWithdrawal(wallet, amount, {
        prepare: async () => ({}),
        commit: async () => ({}),
        db: {
          query: async () => [],
          get: async () => ({}),
        },
      });

      res.json({
        ok: true,
        result,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  return router;
}
