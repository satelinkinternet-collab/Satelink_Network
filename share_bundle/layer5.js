// LAYER-5: Rewards + Ledger + Payout Engine
// Project: Satelink
// MVP-first, LIVE-scalable (rule-driven)

import express from "express";
import Database from "better-sqlite3";

function openDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
}

const RULES = {
  payoutMethodDefault: "record_only",
  thresholds: {
    influencer: 10,
    distributor: 50,
    node: 20,
    builder: 25,
    ops: 0,
  },
};

function getOrCreateEpochId(db, epochType) {
  const now = new Date();

  let epochKey;
  if (epochType === "daily") {
    epochKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
  } else if (epochType === "monthly") {
    epochKey = now.toISOString().slice(0, 7);  // YYYY-MM
  } else if (epochType === "weekly") {
    // Simple weekly key: YYYY-W## (good enough for MVP)
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    const weekStr = String(weekNo).padStart(2, "0");
    epochKey = `${d.getUTCFullYear()}-W${weekStr}`;
  } else {
    throw new Error("Invalid epochType");
  }

  const ts = Math.floor(Date.now() / 1000);

  const found = db.prepare(
    "SELECT id FROM epochs WHERE epoch_type = ? AND epoch_key = ?"
  ).get(epochType, epochKey);

  if (found && found.id) return found.id;

  // Basic ranges for MVP (start/end are informative)
  let startTs = ts;
  let endTs = ts;

  const ins = db.prepare(
    "INSERT INTO epochs (epoch_type, epoch_key, start_ts, end_ts, created_at) VALUES (?,?,?,?,?)"
  ).run(epochType, epochKey, startTs, endTs, ts);

  return ins.lastInsertRowid;
}

function createLayer5Router(dbPath) {
  const router = express.Router();
  const db = openDb(dbPath);

  router.get("/layer5/health", (req, res) => {
    res.json({ ok: true });
  });

  router.post("/rewards/add", (req, res) => {
    try {
      const {
        userWallet,
        userType,
        role = null,
        amount,
        token = "USDT",
        sourceType = "manual",
        status = "claimable",
        note = null,
      } = req.body || {};

      if (!userWallet || !userType) {
        return res.status(400).json({ ok: false, error: "userWallet and userType are required" });
      }

      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt === 0) {
        return res.status(400).json({ ok: false, error: "amount must be a non-zero number" });
      }

      const createdAt = Math.floor(Date.now() / 1000);

      let epochType = "daily";
      if (userType === "distributor") epochType = "weekly";
      if (userType === "ops") epochType = "monthly";
      if (userType === "builder") epochType = "monthly";

      const epochId = getOrCreateEpochId(db, epochType);

      const stmt = db.prepare(`
        INSERT INTO reward_ledger
          (user_wallet, user_type, role, amount, token, source_type, epoch_id, status, payout_queue_id, note, created_at)
        VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)

      `);

      const info = stmt.run(
        userWallet,
        userType,
        role,
        amt,
        token,
        sourceType,
        epochId,
        status,
        note,
        createdAt
      );

      return res.json({ ok: true, ledgerId: info.lastInsertRowid });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  router.get("/rewards/balance/:wallet", (req, res) => {
    try {
      const wallet = req.params.wallet;

      const rows = db.prepare(`
        SELECT token, SUM(amount) AS claimable
        FROM reward_ledger
        WHERE user_wallet = ?
          AND status = 'claimable'
          AND payout_queue_id IS NULL
        GROUP BY token
      `).all(wallet);

      return res.json({ ok: true, wallet, balances: rows });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  router.post("/payouts/run", (req, res) => {
    try {
      const userType = (req.query.userType || "").trim(); // optional filter

      // Pick which userTypes to process
      const userTypes = userType
        ? [userType]
        : ["influencer", "distributor", "node", "builder", "ops"];

      const queued = [];

      for (const ut of userTypes) {
        const threshold = RULES.thresholds[ut] ?? 0;

        // current epoch based on user type cadence
        let epochType = "daily";
        if (ut === "distributor") epochType = "weekly";
        if (ut === "ops") epochType = "monthly";
        if (ut === "builder") epochType = "monthly";

        const epochId = getOrCreateEpochId(db, epochType);

        // Sum claimable rewards by wallet+token for this epoch & user type
        const rows = db.prepare(`
          SELECT user_wallet, token, SUM(amount) AS amt
          FROM reward_ledger
          WHERE status = 'claimable'
            AND payout_queue_id IS NULL
            AND user_type = ?
            AND epoch_id = ?
          GROUP BY user_wallet, token
        `).all(ut, epochId);

        for (const r of rows) {
          const amt = Number(r.amt || 0);
          const eligible = threshold === 0 ? amt > 0 : amt >= threshold;
          if (!eligible) continue;

          // Insert payout queue row
          const createdAt = Math.floor(Date.now() / 1000);
          const pq = db.prepare(`
            INSERT INTO payout_queue
              (user_wallet, user_type, amount, token, epoch_id, method, status, created_at)
            VALUES
              (?, ?, ?, ?, ?, ?, 'queued', ?)
          `).run(
            r.user_wallet,
            ut,
            amt,
            r.token,
            epochId,
            RULES.payoutMethodDefault,
            createdAt
          );

          const payoutQueueId = pq.lastInsertRowid;

          // Link ledger rows to queue id (prevents double queue)
          db.prepare(`
            UPDATE reward_ledger
            SET payout_queue_id = ?
            WHERE status = 'claimable'
              AND payout_queue_id IS NULL
              AND user_wallet = ?
              AND user_type = ?
              AND token = ?
              AND epoch_id = ?
          `).run(payoutQueueId, r.user_wallet, ut, r.token, epochId);

          queued.push({
            userType: ut,
            wallet: r.user_wallet,
            token: r.token,
            amount: amt,
            epochId,
            payoutQueueId,
          });
        }
      }

      return res.json({ ok: true, queuedCount: queued.length, queued });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  router.get("/payouts/status/:wallet", (req, res) => {
    try {
      const wallet = req.params.wallet;

      const rows = db.prepare(`
        SELECT id, user_wallet, user_type, amount, token, epoch_id, method, status, tx_hash, failure_reason, retry_count, created_at
        FROM payout_queue
        WHERE user_wallet = ?
        ORDER BY id DESC
        LIMIT 50
      `).all(wallet);

      return res.json({ ok: true, wallet, payouts: rows });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  router.post("/payouts/mark-sent", (req, res) => {
    try {
      const { payoutQueueId, txHash = null } = req.body || {};
      if (!payoutQueueId) {
        return res.status(400).json({ ok: false, error: "payoutQueueId is required" });
      }

      // mark payout as sent
      db.prepare(`
        UPDATE payout_queue
        SET status='sent', tx_hash=?
        WHERE id=?
      `).run(txHash, payoutQueueId);

      // mark linked ledger entries as paid
      db.prepare(`
        UPDATE reward_ledger
        SET status='paid'
        WHERE payout_queue_id=? AND status='claimable'
      `).run(payoutQueueId);

      return res.json({ ok: true, payoutQueueId, status: "sent", txHash });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  return router;
}

export { openDb, createLayer5Router };



