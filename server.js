import { createLayer5Router } from "./layer5.js";
import path from "path";
import "dotenv/config";
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { ethers } from "ethers";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- CONFIG ----------
const PORT = Number(process.env.PORT || 8080);
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const NODE_REGISTRY_ADDRESS = process.env.NODE_REGISTRY_ADDRESS;

// Hardhat default first account private key (LOCAL ONLY).
// You can override by setting DEPLOYER_PK in .env
const DEPLOYER_PK =
  process.env.DEPLOYER_PK ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ---------- DB ----------
const DB_FILE = path.resolve(process.cwd(), "satelink.db");
const db = new Database(DB_FILE);
console.log("DB PATH =", DB_FILE);


// ✅ DB schema (added epoch_rewards table + indexes)
db.exec(`
CREATE TABLE IF NOT EXISTS heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nodeWallet TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  nonce TEXT NOT NULL,
  signature TEXT NOT NULL,
  payload TEXT,
  createdAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_node_nonce
ON heartbeats(nodeWallet, nonce);

CREATE TABLE IF NOT EXISTS node_status (
  nodeWallet TEXT PRIMARY KEY,
  lastSeen INTEGER NOT NULL,
  online INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS epoch_uptime (
  epochStart INTEGER NOT NULL,
  epochEnd INTEGER NOT NULL,
  nodeWallet TEXT NOT NULL,
  heartbeats INTEGER NOT NULL,
  expected INTEGER NOT NULL,
  uptimePct REAL NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (epochStart, epochEnd, nodeWallet)
);

CREATE TABLE IF NOT EXISTS registered_nodes (
  wallet TEXT PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 1,
  registeredAt INTEGER DEFAULT 0,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registered_nodes_active
ON registered_nodes(active);

-- ✅ NEW: Reward ledger table
CREATE TABLE IF NOT EXISTS epoch_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  epochStart INTEGER NOT NULL,
  epochEnd   INTEGER NOT NULL,

  nodeWallet TEXT NOT NULL,

  uptimePct  REAL NOT NULL,
  qualified  INTEGER NOT NULL CHECK (qualified IN (0,1)),

  rewardAmount TEXT NOT NULL DEFAULT '0',
  rewardToken  TEXT NOT NULL DEFAULT 'SAT',

  payoutChain TEXT,
  payoutTxHash TEXT,
  payoutStatus TEXT NOT NULL DEFAULT 'pending',

  createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now')),

  UNIQUE(epochStart, epochEnd, nodeWallet)
);

CREATE INDEX IF NOT EXISTS idx_epoch_rewards_epoch
ON epoch_rewards(epochStart, epochEnd);

CREATE INDEX IF NOT EXISTS idx_epoch_rewards_wallet
ON epoch_rewards(nodeWallet);
`);

// ---------- HELPERS ----------
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function heartbeatMessage({ nodeWallet, timestamp, nonce, stats }) {
  const statsStr = stats ? JSON.stringify(stats) : "{}";
  return `SATELINK_HEARTBEAT
wallet=${nodeWallet}
timestamp=${timestamp}
nonce=${nonce}
stats=${statsStr}`;
}

// ---------- CONSTANTS FOR EPOCH ----------
const EPOCH_SECONDS = 600; // 10 minutes
const EXPECTED_HEARTBEATS = 10; // if node sends every 60s
const QUALIFY_UPTIME_PCT = 80; // ✅ NEW: qualification threshold
const EPOCH_POOL = "1000"; // total rewards per epoch (string for safety)


function floorToEpoch(ts) {
  return ts - (ts % EPOCH_SECONDS);
}

// ---------- ROUTES ----------

// Health
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "satelink-heartbeat",
    rpc: RPC_URL,
    registry: NODE_REGISTRY_ADDRESS || null,
    time: nowSec(),
  });
});

// Heartbeat (DB-registered nodes only)
// L5.5: Record ops (atomic UPSERT into op_counts)
app.post("/ops/record", (req, res) => {
  try {
    const { epoch_id, user_wallet, op_type, delta_ops, weight } = req.body || {};

    if (!epoch_id || !user_wallet || !op_type) {
      return res.status(400).json({ ok: false, error: "missing epoch_id/user_wallet/op_type" });
    }

    const opsInc = Number.isFinite(Number(delta_ops)) ? Number(delta_ops) : 1;
    const w = Number.isFinite(Number(weight)) ? Number(weight) : 1.0;

    const now = Math.floor(Date.now() / 1000);

    const sql = `
      INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(epoch_id, user_wallet, op_type)
      DO UPDATE SET
        ops = op_counts.ops + excluded.ops,
        weight = excluded.weight;
    `;

    db.prepare(sql).run(epoch_id, user_wallet, op_type, opsInc, w, now);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// L5.6: Finalize epoch rewards from protocol pool -> reward_ledger (idempotent)
app.post("/epoch/finalize", (req, res) => {
  try {
    const { epoch_id, token } = req.body || {};
    const eid = Number(epoch_id);
    const tkn = (token || "SAT").toUpperCase();

    if (!Number.isFinite(eid) || eid <= 0) {
      return res.status(400).json({ ok: false, error: "invalid epoch_id" });
    }

    // Ensure pool exists and is open
    const pool = db
      .prepare("SELECT id, total_amount, status FROM protocol_pools WHERE epoch_id=? AND token=? LIMIT 1")
      .get(eid, tkn);

    if (!pool) return res.status(400).json({ ok: false, error: "no protocol pool for epoch/token" });
    if (pool.status !== "open") return res.status(400).json({ ok: false, error: "pool not open" });

    const now = Math.floor(Date.now() / 1000);

    const sql = `
      WITH wallet_ops AS (
        SELECT
          oc.user_wallet,
          SUM(oc.ops * w.weight) AS weighted_ops
        FROM op_counts oc
        JOIN op_weights w ON w.op_type = oc.op_type
        WHERE oc.epoch_id = ?
        GROUP BY oc.user_wallet
      ),
      totals AS (
        SELECT
          (SELECT total_amount FROM protocol_pools WHERE epoch_id=? AND token=? LIMIT 1) AS pool_total,
          (SELECT SUM(weighted_ops) FROM wallet_ops) AS total_weighted_ops
      ),
      payouts AS (
        SELECT
          wo.user_wallet,
          ROUND(t.pool_total * (wo.weighted_ops / t.total_weighted_ops), 6) AS amount
        FROM wallet_ops wo
        CROSS JOIN totals t
        WHERE t.total_weighted_ops > 0
      )
      INSERT OR IGNORE INTO reward_ledger (
        user_wallet, user_type, role,
        amount, token, source_type,
        epoch_id, status,
        created_at, note
      )
      SELECT
        p.user_wallet, 'node', 'node',
        p.amount, ?, 'protocol_pool',
        ?, 'claimable',
        ?, 'epoch_finalize'
      FROM payouts p;
    `;

    const info = db.prepare(sql).run(eid, eid, tkn, tkn, eid, now);

    // Mark pool finalized
    db.prepare("UPDATE protocol_pools SET status='finalized' WHERE id=?").run(pool.id);

    return res.json({ ok: true, inserted: info.changes, pool_id: pool.id, epoch_id: eid, token: tkn });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/heartbeat", async (req, res) => {
  try {
    const { nodeWallet, timestamp, nonce, stats, signature } = req.body || {};

    if (!nodeWallet || !timestamp || !nonce || !signature) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }
    if (!ethers.isAddress(nodeWallet)) {
      return res.status(400).json({ ok: false, error: "Invalid wallet" });
    }

    // Check registered_nodes (SQLite) — enforce active=1
    const row = db
      .prepare("SELECT wallet, active FROM registered_nodes WHERE wallet = ?")
      .get(nodeWallet.toLowerCase());

    if (!row || row.active !== 1) {
      return res.status(403).json({ ok: false, error: "Wallet not registered" });
    }

    // Signature verify
    const msg = heartbeatMessage({ nodeWallet, timestamp, nonce, stats });
    const recovered = ethers.verifyMessage(msg, signature);

    if (recovered.toLowerCase() !== nodeWallet.toLowerCase()) {
      return res.status(401).json({ ok: false, error: "Bad signature" });
    }

    // Store heartbeat
    db.prepare(
      `
      INSERT INTO heartbeats(nodeWallet, timestamp, nonce, signature, payload, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      nodeWallet.toLowerCase(),
      Number(timestamp),
      String(nonce),
      String(signature),
      JSON.stringify(stats || {}),
      nowSec()
    );

    // Update node status
    db.prepare(
      `
      INSERT INTO node_status(nodeWallet, lastSeen, online)
      VALUES (?, ?, 1)
      ON CONFLICT(nodeWallet) DO UPDATE SET lastSeen=excluded.lastSeen, online=1
    `
    ).run(nodeWallet.toLowerCase(), nowSec());

    return res.json({ ok: true });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("UNIQUE") || msg.includes("idx_node_nonce")) {
      return res.status(409).json({ ok: false, error: "Replay nonce" });
    }
    return res.status(500).json({ ok: false, error: msg });
  }
});

// Nodes status
app.get("/nodes", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM node_status`).all();
  res.json({ ok: true, nodes: rows });
});

// Mark offline if no heartbeat for 3 minutes
setInterval(() => {
  const cutoff = nowSec() - 180;
  db.prepare(`UPDATE node_status SET online=0 WHERE lastSeen < ?`).run(cutoff);
}, 30_000);

// Register a wallet ON-CHAIN (local hardhat signer)
app.post("/registry/register", async (req, res) => {
  try {
    const { wallet } = req.body || {};
    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ ok: false, error: "Invalid wallet" });
    }

    if (!NODE_REGISTRY_ADDRESS || !ethers.isAddress(NODE_REGISTRY_ADDRESS)) {
      return res.status(500).json({
        ok: false,
        error: "NODE_REGISTRY_ADDRESS missing/invalid in .env",
      });
    }

    const signer = new ethers.Wallet(DEPLOYER_PK, provider);

    const abi = ["function registerNode(address wallet)"];
    const registry = new ethers.Contract(NODE_REGISTRY_ADDRESS, abi, signer);

    const tx = await registry.registerNode(wallet);
    await tx.wait();

    return res.json({ ok: true, registered: wallet, txHash: tx.hash });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Sync on-chain registry → SQLite registered_nodes
app.post("/registry/sync", async (_req, res) => {
  try {
    if (!NODE_REGISTRY_ADDRESS || !ethers.isAddress(NODE_REGISTRY_ADDRESS)) {
      return res.status(500).json({
        ok: false,
        error: "NODE_REGISTRY_ADDRESS missing/invalid in .env",
      });
    }

    const registry = new ethers.Contract(
      NODE_REGISTRY_ADDRESS,
      [
        "function nodeCount() view returns (uint256)",
        "function getNode(uint256) view returns (address wallet, bool active)",
      ],
      provider
    );

    const count = Number(await registry.nodeCount());
    const now = nowSec();

    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < count; i++) {
      const [walletRaw, activeBool] = await registry.getNode(i);
      const w = walletRaw.toLowerCase();
      const active = activeBool ? 1 : 0;

      const exists = db
        .prepare("SELECT wallet FROM registered_nodes WHERE wallet = ?")
        .get(w);

      if (!exists) {
        db.prepare(
          `
          INSERT INTO registered_nodes (wallet, active, registeredAt, updatedAt)
          VALUES (?, ?, ?, ?)
        `
        ).run(w, active, now, now);
        inserted++;
      } else {
        db.prepare(
          `
          UPDATE registered_nodes
          SET active = ?, updatedAt = ?
          WHERE wallet = ?
        `
        ).run(active, now, w);
        updated++;
      }
    }

    return res.json({ ok: true, totalOnChain: count, inserted, updated });
  } catch (err) {
    console.error("registry sync error", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});




// Latest rewards (latest epoch)
app.get("/rewards/latest", (_req, res) => {
  try {
    const latest = db
      .prepare(
        `
        SELECT epochStart, epochEnd
        FROM epoch_rewards
        ORDER BY epochEnd DESC
        LIMIT 1
      `
      )
      .get();

    if (!latest) return res.json({ ok: true, epoch: null, rewards: [] });
// Update payout status for a node reward (used after on-chain payout)
app.post("/rewards/markPaid", (req, res) => {
  try {
    const { epochStart, epochEnd, nodeWallet, payoutChain, payoutTxHash, payoutStatus } = req.body || {};

    if (!epochStart || !epochEnd || !nodeWallet) {
      return res.status(400).json({ ok: false, error: "epochStart, epochEnd, nodeWallet required" });
    }

    const status = payoutStatus || "paid";

    const stmt = db.prepare(`
      UPDATE epoch_rewards
      SET payoutChain = COALESCE(?, payoutChain),
          payoutTxHash = COALESCE(?, payoutTxHash),
          payoutStatus = ?
      WHERE epochStart = ? AND epochEnd = ? AND LOWER(nodeWallet) = LOWER(?)
    `);

    const info = stmt.run(
      payoutChain || null,
      payoutTxHash || null,
      status,
      Number(epochStart),
      Number(epochEnd),
      String(nodeWallet)
    );

    return res.json({ ok: true, updated: info.changes });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

    const rewards = db
      .prepare(
        `
        SELECT *
        FROM epoch_rewards
        WHERE epochStart = ? AND epochEnd = ?
        ORDER BY qualified DESC, uptimePct DESC
      `
      )
      .all(latest.epochStart, latest.epochEnd);

    return res.json({ ok: true, epoch: latest, rewards });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});


// ---------- START ----------
app.listen(PORT, () => {
  console.log(`Heartbeat server running on http://localhost:${PORT}`);
});
