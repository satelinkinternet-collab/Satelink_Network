import express from "express";
import { createAdminAuth } from "./src/middleware/auth.js";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import { ethers } from "ethers";
import "dotenv/config";
import fs from "fs";
import { OperationsEngine } from "./src/services/operations-engine.js";
import { createLedgerRouter } from "./src/routes/ledger.js";

const PORT = process.env.PORT || 8080;

// Deterministic Admin Auth Middleware (Day-1 Requirement)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
  console.error("CRITICAL ERROR: ADMIN_API_KEY is not configured in .env. Failsafe shutdown.");
  process.exit(1);
}



export const createApp = (db) => {
  const app = express();

  // Initialize Operations Engine
  const opsEngine = new OperationsEngine(db);
  const epochId = opsEngine.initEpoch();
  console.log(`Current Epoch ID: ${epochId}`);

  // Initial Treasury Safety Check (Day-1 Financial Guard)
  const treasuryCheck = opsEngine.monitorTreasuryBalance();
  console.log(`Treasury Safety Check: ${treasuryCheck.status} (Balance: ${treasuryCheck.availableBalance})`);

  // Run Financial Monitor every 30 minutes
  setInterval(() => {
    try {
      opsEngine.monitorTreasuryBalance();
    } catch (e) {
      console.error("Treasury Monitor Error:", e);
    }
  }, 30 * 60 * 1000);

  // Run Claims Monitor every 1 hour (Day-1 Enforcement)
  setInterval(() => {
    try {
      opsEngine.forfeitExpired();
    } catch (e) {
      console.error("Claims Monitor Error:", e);
    }
  }, 60 * 60 * 1000);

  // Monitored Admin Auth (Day-1 Security Requirement)
  const monitoredAdminAuth = createAdminAuth(opsEngine);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));

  // Rate Limiting (Global)
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100
  });
  app.use(limiter);

  // ---------------------------------------------------------
  // Existing Node Logic (with DB handled by OperationsEngine)
  // ---------------------------------------------------------


  // Heartbeat Endpoint
  app.post("/heartbeat", async (req, res) => {
    try {
      const { nodeWallet, timestamp, nonce, stats, signature } = req.body;

      if (!nodeWallet || !timestamp || nonce === undefined || !stats || !signature) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // 1. Verify Message Format
      const statsStr = JSON.stringify(stats);
      const message = `SATELINK_HEARTBEAT
wallet=${nodeWallet}
timestamp=${timestamp}
nonce=${nonce}
stats=${statsStr}`;

      // 1-3. Run Monitored Security Checks
      const check = opsEngine.processHeartbeatSecurity({
        nodeWallet,
        message,
        signature,
        timestamp,
        nonce
      });

      if (!check.ok) {
        return res.status(check.code || 400).json({ error: check.error });
      }

      const now = Math.floor(Date.now() / 1000);
      // Update DB
      db.prepare(`
          INSERT INTO registered_nodes (wallet, last_heartbeat, last_nonce, active, updatedAt)
          VALUES (?, ?, ?, 1, ?)
          ON CONFLICT(wallet) DO UPDATE SET last_heartbeat = ?, last_nonce = ?, active = 1, updatedAt = ?
        `).run(nodeWallet, now, nonce, now, now, nonce, now);

      res.json({ status: "ok", timestamp: now, nonceAccepted: nonce });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------------------------------------------------
  // New Operations Engine Endpoints
  // ---------------------------------------------------------

  app.post("/operations/routing", (req, res) => {
    try {
      const { nodeWallet, bytesRouted } = req.body;
      if (!nodeWallet) return res.status(400).json({ error: "Missing nodeWallet" });

      // Default 1GB if not specified, for testing
      const result = opsEngine.processRouting({ nodeWallet, bytesRouted: bytesRouted || 1024 * 1024 * 1024 });
      return res.json({ ok: true, ...result });
    } catch (e) {
      if (e.message.includes("Rate limit")) return res.status(429).json({ error: e.message });
      return res.status(500).json({ ok: false, error: String(e.message) });
    }
  });

  app.post("/operations/verification", (req, res) => {
    try {
      const { nodeWallet } = req.body;
      if (!nodeWallet) return res.status(400).json({ error: "Missing nodeWallet" });

      const result = opsEngine.processVerification({ nodeWallet });
      return res.json({ ok: true, ...result });
    } catch (e) {
      if (e.message.includes("Rate limit")) return res.status(429).json({ error: e.message });
      return res.status(500).json({ ok: false, error: String(e.message) });
    }
  });

  // Generic Execute Endpoint for Mandatory Ops
  app.post("/operations/execute", (req, res) => {
    try {
      const { nodeWallet, opType, quantity } = req.body;
      if (!nodeWallet || !opType) return res.status(400).json({ error: "Missing fields" });

      const result = opsEngine.executeOp({ nodeWallet, opType, quantity: quantity || 1 });
      return res.json({ ok: true, ...result });
    } catch (e) {
      if (e.message.includes("Rate limit")) return res.status(429).json({ error: e.message });
      if (e.message.includes("Invalid OpType")) return res.status(400).json({ error: e.message });
      return res.status(500).json({ ok: false, error: String(e.message) });
    }
  });

  app.get("/operations/epoch-stats", (req, res) => {
    try {
      const { epochId } = req.query;
      const stats = opsEngine.getEpochStats(epochId ? Number(epochId) : null);
      return res.json({ ok: true, stats });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message) });
    }
  });

  // ---------------------------------------------------------
  // Ledger L5 Router (Mounted)
  // ---------------------------------------------------------
  app.use("/ledger", createLedgerRouter(opsEngine, monitoredAdminAuth));

  // ---------------------------------------------------------
  // Registry & Protocol (Protected)
  // ---------------------------------------------------------
  app.post("/epoch/finalize", monitoredAdminAuth, (req, res) => {
    const { epochId } = req.body;
    if (!epochId) return res.status(400).json({ error: "Missing epochId" });
    try {
      const result = opsEngine.finalizeEpoch(epochId);
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/registry/sync", monitoredAdminAuth, (req, res) => {
    res.json({ ok: true, synced: true, timestamp: Math.floor(Date.now() / 1000) });
  });

  app.post("/protocol/pool/open", monitoredAdminAuth, (req, res) => {
    res.json({ ok: true, poolStatus: 'OPEN', timestamp: Math.floor(Date.now() / 1000) });
  });

  app.post("/withdraw/execute", monitoredAdminAuth, (req, res) => {
    try {
      const { nodeWallet, amount } = req.body;
      if (!nodeWallet || !amount) return res.status(400).json({ error: "Missing nodeWallet or amount" });
      const result = opsEngine.withdrawFunds(nodeWallet, Number(amount));
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/admin/config", monitoredAdminAuth, (req, res) => {
    try {
      const { key, value } = req.body;
      const result = opsEngine.updateSystemConfig(key, value);
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Backwards compatibility for the finalize route if needed in tests
  app.post("/operations/epoch/finalize", monitoredAdminAuth, (req, res) => {
    const { epochId } = req.body;
    if (!epochId) return res.status(400).json({ error: "Missing epochId" });
    try {
      const result = opsEngine.finalizeEpoch(epochId);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ---------------------------------------------------------
  // Payments & Revenue (Mock for MVP)
  // ---------------------------------------------------------

  app.post("/nodes/bootstrap-payment", monitoredAdminAuth, (req, res) => {
    try {
      const { nodeWallet, nodeType, paymentTxHash } = req.body;
      const MANAGED_NODE_PRICE = 50;

      const type = nodeType || 'managed';

      // Record bootstrap revenue
      db.prepare(`
                INSERT INTO revenue_events (amount, token, source, payer_wallet, reference, created_at, on_chain_tx)
                VALUES (?, 'USDT', ?, ?, ?, ?, ?)
            `).run(
        MANAGED_NODE_PRICE,
        'managed_node_bootstrap',
        nodeWallet,
        `node:${nodeWallet}`,
        Math.floor(Date.now() / 1000),
        paymentTxHash || 'mock_tx_hash'
      );

      // Update or Insert Node with type
      db.prepare(`
          INSERT INTO registered_nodes (wallet, node_type, active, updatedAt)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(wallet) DO UPDATE SET node_type = ?, active = 1, updatedAt = ?
      `).run(nodeWallet, type, Math.floor(Date.now() / 1000), type, Math.floor(Date.now() / 1000));

      return res.json({ ok: true, activated: true, type });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message) });
    }
  });

  return app;
}

// Execution Block
// Only run if main module
if (process.argv[1] === fs.realpathSync(new URL(import.meta.url).pathname) ||
  process.argv[1].endsWith('server.js')) {

  // Initialize Database
  const db = new Database("satelink.db");
  db.pragma('journal_mode = WAL');

  const app = createApp(db);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Default export if imported directly (though create app is preferred)
export default createApp; 
