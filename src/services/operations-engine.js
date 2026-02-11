import { ethers } from "ethers";
const OP_CONFIG = {
  'api_relay_execution': { price: 0.01, limit: 100 },
  'automation_job_execute': { price: 0.05, limit: 50 },
  'network_health_oracle_update': { price: 0.02, limit: 60 },
  'routing_decision_compute': { price: 0.001, limit: 1000 },
  'verification_op': { price: 0.05, limit: 50 },
  'provisioning_op': { price: 0.10, limit: 10 },
  'monitoring_op': { price: 0.01, limit: 120 },
  'claim_validation_op': { price: 0.02, limit: 20 },
  'withdraw_execution_op': { price: 0.05, limit: 10 },
  'epoch_score_compute': { price: 0.05, limit: 5 }
};

export class OperationsEngine {
  constructor(db) {
    this.db = db;
    this.currentEpochId = null;
    this.initialize();
  }

  initialize() {
    // Ensure tables exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS epochs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        epoch_type TEXT NOT NULL,
        epoch_key TEXT NOT NULL,
        start_ts INTEGER NOT NULL,
        end_ts INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS op_counts (
        epoch_id INTEGER NOT NULL,
        user_wallet TEXT NOT NULL,
        op_type TEXT NOT NULL,
        ops REAL DEFAULT 0,
        weight REAL DEFAULT 1.0,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (epoch_id, user_wallet, op_type)
      );
      CREATE TABLE IF NOT EXISTS revenue_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        token TEXT NOT NULL,
        source TEXT NOT NULL,
        payer_wallet TEXT,
        reference TEXT,
        created_at INTEGER NOT NULL,
        on_chain_tx TEXT
      );
      CREATE TABLE IF NOT EXISTS op_weights (
        op_type TEXT PRIMARY KEY,
        weight REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS registered_nodes (
        wallet TEXT PRIMARY KEY,
        last_heartbeat INTEGER,
        last_nonce INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        node_type TEXT DEFAULT 'edge',
        infra_reserved REAL DEFAULT 0,
        is_flagged INTEGER DEFAULT 0,
        updatedAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS heartbeat_security_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_wallet TEXT NOT NULL,
        event_type TEXT NOT NULL,
        details TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rate_limits (
        node_wallet TEXT NOT NULL,
        op_type TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER DEFAULT 0,
        PRIMARY KEY (node_wallet, op_type)
      );
      CREATE TABLE IF NOT EXISTS reward_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        epoch_id INTEGER NOT NULL,
        node_wallet TEXT NOT NULL,
        amount REAL NOT NULL,
        split_type TEXT DEFAULT 'NODE_POOL',
        finalized_at INTEGER NOT NULL,
        UNIQUE(epoch_id, node_wallet, split_type)
      );
      CREATE TABLE IF NOT EXISTS payout_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ledger_id INTEGER NOT NULL,
        node_wallet TEXT NOT NULL,
        amount REAL NOT NULL,
        withdrawn_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        claim_id TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS auth_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        ip TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    // Seed System Config
    const seed = this.db.prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)");
    seed.run('withdrawals_paused', '0');
    seed.run('security_freeze', '0');
    seed.run('safety_threshold', '0');
    seed.run('system_state', 'LIVE');
    seed.run('revenue_mode', 'ACTIVE');
    seed.run('monitoring_status', 'ENFORCED');

    // Migration: Update payout_queue (for existing DBs)
    try {
      const cols = this.db.pragma("table_info(payout_queue)").map(c => c.name);
      if (!cols.includes("withdrawn_amount")) this.db.prepare("ALTER TABLE payout_queue ADD COLUMN withdrawn_amount REAL DEFAULT 0").run();
      if (!cols.includes("expires_at")) {
        const defaultExpiry = Math.floor(Date.now() / 1000) + (48 * 24 * 60 * 60);
        this.db.prepare(`ALTER TABLE payout_queue ADD COLUMN expires_at INTEGER DEFAULT ${defaultExpiry}`).run();
      }
    } catch (e) { }

    // Migration: Update registered_nodes (for existing DBs)
    try {
      const cols = this.db.pragma("table_info(registered_nodes)").map(c => c.name);
      if (!cols.includes("last_nonce")) this.db.prepare("ALTER TABLE registered_nodes ADD COLUMN last_nonce INTEGER DEFAULT 0").run();
      if (!cols.includes("last_heartbeat")) this.db.prepare("ALTER TABLE registered_nodes ADD COLUMN last_heartbeat INTEGER").run();
      if (!cols.includes("active")) this.db.prepare("ALTER TABLE registered_nodes ADD COLUMN active INTEGER DEFAULT 1").run();
      if (!cols.includes("node_type")) this.db.prepare("ALTER TABLE registered_nodes ADD COLUMN node_type TEXT DEFAULT 'edge'").run();
      if (!cols.includes("infra_reserved")) this.db.prepare("ALTER TABLE registered_nodes ADD COLUMN infra_reserved REAL DEFAULT 0").run();
      if (!cols.includes("updatedAt")) this.db.prepare("ALTER TABLE registered_nodes ADD COLUMN updatedAt INTEGER").run();
    } catch (e) { }

    // Migration: Add is_finalized to epochs if missing
    try {
      const cols = this.db.pragma("table_info(epochs)").map(c => c.name);
      if (!cols.includes("is_finalized")) {
        this.db.prepare("ALTER TABLE epochs ADD COLUMN is_finalized INTEGER DEFAULT 0").run();
      }
    } catch (e) { }

    // Seed weights if empty
    const count = this.db.prepare("SELECT COUNT(*) as c FROM op_weights").get().c;
    if (count === 0) {
      const insert = this.db.prepare("INSERT INTO op_weights (op_type, weight) VALUES (?, ?)");
      Object.keys(OP_CONFIG).forEach(op => {
        insert.run(op, 1.0);
      });
    }
  }

  /**
   * Toggle System Config
   */
  updateSystemConfig(key, value) {
    this.db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)").run(key, value);
    return { key, value };
  }

  /**
   * Security Check: Is System Safe?
   */
  isSystemSafe() {
    const paused = this.db.prepare("SELECT value FROM system_config WHERE key = 'withdrawals_paused'").get();
    const frozen = this.db.prepare("SELECT value FROM system_config WHERE key = 'security_freeze'").get();

    if (paused?.value === '1' || frozen?.value === '1') return false;

    // Auto-Freeze if Treasury is negative (emergency guard)
    const balance = this.getTreasuryAvailable();
    if (balance < -0.01) { // Small epsilon
      this.updateSystemConfig('security_freeze', '1');
      return false;
    }

    return true;
  }

  /**
   * Abuse Detection Logic
   */
  detectAbuse(nodeWallet) {
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;

    // Detect spike in operations (e.g. > 5000 ops in last hour)
    const row = this.db.prepare(`
          SELECT SUM(ops) as total_ops FROM op_counts 
          WHERE user_wallet = ? AND created_at > ?
      `).get(nodeWallet, oneHourAgo);

    if (row?.total_ops > 5000) {
      this.flagNode(nodeWallet, 'OPERATION_SPIKE_THROTTLED', `Total Ops (1h): ${row.total_ops}`);
      return true;
    }
    return false;
  }


  /**
   * Initialize current epoch
   */
  initEpoch() {
    const now = Math.floor(Date.now() / 1000);
    const epochKey = new Date().toISOString().slice(0, 10); // Daily

    let existing = this.db.prepare(`
      SELECT id FROM epochs WHERE epoch_key = ? AND epoch_type = 'daily'
      `).get(epochKey);

    if (existing) {
      this.currentEpochId = existing.id;
      return existing.id;
    }

    const result = this.db.prepare(`
      INSERT INTO epochs(epoch_type, epoch_key, start_ts, end_ts, created_at, is_finalized)
    VALUES('daily', ?, ?, ?, ?, 0)
      `).run(epochKey, now, now + 86400, now);

    this.currentEpochId = result.lastInsertRowid;
    return this.currentEpochId;
  }

  /**
   * Check and Update Rate Limit
   * Sliding window or fixed window (1 minute)
   */
  checkRateLimit(nodeWallet, opType) {
    const now = Math.floor(Date.now() / 1000);
    const windowSize = 60; // 1 minute
    const currentWindow = Math.floor(now / windowSize) * windowSize;
    const limit = OP_CONFIG[opType]?.limit || 10;

    const row = this.db.prepare(`
            SELECT window_start, count FROM rate_limits 
            WHERE node_wallet = ? AND op_type = ?
      `).get(nodeWallet, opType);

    if (row) {
      if (row.window_start < currentWindow) {
        // New window, reset
        this.db.prepare(`
                    UPDATE rate_limits SET window_start = ?, count = 1 
                    WHERE node_wallet = ? AND op_type = ?
      `).run(currentWindow, nodeWallet, opType);
        return true;
      } else {
        // Same window
        if (row.count >= limit) return false;
        this.db.prepare(`
                    UPDATE rate_limits SET count = count + 1 
                    WHERE node_wallet = ? AND op_type = ?
      `).run(nodeWallet, opType);
        return true;
      }
    } else {
      // First time
      this.db.prepare(`
                INSERT INTO rate_limits(node_wallet, op_type, window_start, count)
    VALUES(?, ?, ?, 1)
            `).run(nodeWallet, opType, currentWindow);
      return true;
    }
  }

  /**
   * Execute a Mandatory Operation
   */
  executeOp({ nodeWallet, opType, quantity = 1 }) {
    if (!OP_CONFIG[opType]) {
      throw new Error(`Invalid OpType: ${opType} `);
    }

    if (!this.checkRateLimit(nodeWallet, opType)) {
      throw new Error(`Rate limit exceeded for ${opType}`);
    }

    const price = OP_CONFIG[opType].price;
    return this.recordOperation({
      userWallet: nodeWallet,
      opType: opType,
      quantity: quantity,
      pricePerOp: price
    });
  }

  /**
   * Record a paid operation (Internal)
   */
  recordOperation({ userWallet, opType, quantity = 1, pricePerOp = 0.01 }) {
    if (!this.currentEpochId) this.initEpoch();

    // Ensure not finalized
    const epoch = this.db.prepare("SELECT is_finalized FROM epochs WHERE id = ?").get(this.currentEpochId);
    if (epoch && epoch.is_finalized) {
      const msg = `IMMUTABILITY_VIOLATION: Attempted to record operation for finalized Epoch ${this.currentEpochId}`;
      console.error(`CRITICAL ERROR: ${msg}`);
      throw new Error("Epoch is finalized. Cannot record new operations.");
    }

    const revenue = quantity * pricePerOp;
    const now = Math.floor(Date.now() / 1000);

    // Get weight for this operation type
    const weightRow = this.db.prepare(`
      SELECT weight FROM op_weights WHERE op_type = ?
      `).get(opType);

    const w = weightRow ? weightRow.weight : 1.0;

    // Ensure node is registered (at least as edge)
    this.db.prepare(`
        INSERT INTO registered_nodes(wallet, node_type, active, updatedAt)
    VALUES(?, 'edge', 1, ?)
        ON CONFLICT(wallet) DO UPDATE SET active = 1, updatedAt = ?
      `).run(userWallet, now, now);

    // Record in op_counts
    this.db.prepare(`
      INSERT INTO op_counts(epoch_id, user_wallet, op_type, ops, weight, created_at)
    VALUES(?, ?, ?, ?, ?, ?)
      ON CONFLICT(epoch_id, user_wallet, op_type)
      DO UPDATE SET ops = op_counts.ops + excluded.ops
      `).run(this.currentEpochId, userWallet, opType, quantity, w, now);

    // Abuse Detection Spike check
    if (this.detectAbuse(userWallet)) {
      throw new Error("Abuse Detected: Operation spike detected for this node. Throttling.");
    }
    // Record revenue event (simulated payment)
    this.db.prepare(`
      INSERT INTO revenue_events(amount, token, source, payer_wallet, reference, created_at)
    VALUES(?, 'USDT', ?, NULL, ?, ?)
    `).run(revenue, `operation:${opType} `, `epoch:${this.currentEpochId} `, now);

    return { revenue, epochId: this.currentEpochId, opType, opsProcessed: quantity };
  }

  /**
   * Legacy Compat - Process routing operation
   */
  processRouting({ nodeWallet, bytesRouted }) {
    // Map to new mandatory op 'routing_decision_compute'
    // Logic: 1GB = 1 Unit of 'routing_decision_compute'
    const gb = bytesRouted / (1024 * 1024 * 1024);
    const quantity = Math.max(1, Math.floor(gb));

    return this.executeOp({
      nodeWallet,
      opType: 'routing_decision_compute',
      quantity
    });
  }

  /**
   * Legacy Compat - Process verification operation
   */
  processVerification({ nodeWallet }) {
    return this.executeOp({
      nodeWallet,
      opType: 'verification_op',
      quantity: 1
    });
  }

  /**
   * Finalize Epoch (Deterministic)
   * Enforces 50/30/20 Split and Infra Reserve
   */
  finalizeEpoch(epochId) {
    const id = epochId || this.currentEpochId;
    const epoch = this.db.prepare("SELECT * FROM epochs WHERE id = ?").get(id);

    if (!epoch) throw new Error("Epoch not found");
    if (epoch.is_finalized) {
      const msg = `DOUBLE_FINALIZATION_ATTEMPT: Epoch ${id} is already finalized. Blocking operation.`;
      console.error(`CRITICAL ERROR: ${msg}`);
      this.flagNode('PLATFORM_TREASURY', 'EPOCH_LIFECYCLE_ANOMALY', msg);
      throw new Error("Epoch already finalized");
    }

    const now = Math.floor(Date.now() / 1000);

    // constants
    const MONTHLY_INFRA_COST = 50;
    const INFRA_RESERVE_CAP = MONTHLY_INFRA_COST * 6; // 6 months cap

    // 1. Calculate Total Revenue
    const revRow = this.db.prepare(`
            SELECT SUM(amount) as total FROM revenue_events WHERE reference LIKE ?
      `).get(`epoch:${id}% `);
    const totalRevenue = revRow.total || 0;

    // MONITOR: Alert if revenue == 0 with ops > 0 (Pricing/Abuse Investigation)
    const opsSummary = this.db.prepare("SELECT COUNT(*) as count FROM op_counts WHERE epoch_id = ?").get(id);
    if (totalRevenue === 0 && opsSummary.count > 0) {
      const msg = `Investigate Pricing/Abuse: 0 revenue for ${opsSummary.count} ops recorded in epoch ${id}`;
      console.error(`CRITICAL ALERT: ${msg}`);
      this.flagNode('PLATFORM_TREASURY', 'REVENUE_ANOMALY', msg);
    }

    if (totalRevenue === 0) {
      this.db.prepare("UPDATE epochs SET is_finalized = 1 WHERE id = ?").run(id);
      return { epochId: id, totalRevenue: 0, rewardsDistributed: 0 };
    }

    // 2. Enforce Splits: 50 / 30 / 20
    const nodePool = totalRevenue * 0.50;
    const treasuryPool = totalRevenue * 0.30;
    const ecosystemPool = totalRevenue * 0.20;

    // 3. Distribute to Nodes
    const opsStats = this.db.prepare(`
            SELECT c.user_wallet, SUM(c.ops * c.weight) as weighted_score, n.node_type, n.infra_reserved
            FROM op_counts c
            JOIN registered_nodes n ON c.user_wallet = n.wallet
            WHERE c.epoch_id = ?
            GROUP BY c.user_wallet
            HAVING SUM(c.ops) >= 10
        `).all(id);

    const totalScore = opsStats.reduce((sum, n) => sum + n.weighted_score, 0);

    const rewards = [];

    const insertLedger = this.db.prepare(`
            INSERT INTO reward_ledger(epoch_id, node_wallet, amount, split_type, finalized_at)
    VALUES(?, ?, ?, ?, ?)
      `);

    const insertPayout = this.db.prepare(`
            INSERT INTO payout_queue(ledger_id, node_wallet, amount, status, created_at, expires_at)
    VALUES(?, ?, ?, 'PENDING', ?, ?)
      `);

    const updateInfraReserve = this.db.prepare(`
        UPDATE registered_nodes SET infra_reserved = infra_reserved + ? WHERE wallet = ?
      `);

    const updateEpoch = this.db.prepare("UPDATE epochs SET is_finalized = 1 WHERE id = ?");

    // Auto-forfeit expired payouts before finalization
    this.forfeitExpired();

    const tx = this.db.transaction(() => {
      // Record Treasury & Ecosystem Splits
      insertLedger.run(id, 'PLATFORM_TREASURY', treasuryPool, 'TREASURY', now);
      insertLedger.run(id, 'PLATFORM_ECOSYSTEM', ecosystemPool, 'ECOSYSTEM', now);

      const expiry = now + (48 * 24 * 60 * 60);

      for (const node of opsStats) {
        if (totalScore > 0) {
          const share = node.weighted_score / totalScore;
          const grossReward = nodePool * share;

          let infraReserve = 0;
          let netReward = grossReward;

          // Infra Reserve Rule: 10% for Managed nodes, capped at 6 months
          if (node.node_type === 'managed' && node.infra_reserved < INFRA_RESERVE_CAP) {
            infraReserve = grossReward * 0.10;
            // Check cap
            if (node.infra_reserved + infraReserve > INFRA_RESERVE_CAP) {
              infraReserve = INFRA_RESERVE_CAP - node.infra_reserved;
            }
            netReward = grossReward - infraReserve;

            // Record Reserve
            if (infraReserve > 0) {
              insertLedger.run(id, node.user_wallet, infraReserve, 'INFRA_RESERVE', now);
              updateInfraReserve.run(infraReserve, node.user_wallet);
            }
          }

          // Record Net Node Reward
          if (netReward > 0) {
            const res = insertLedger.run(id, node.user_wallet, netReward, 'NODE_POOL', now);
            insertPayout.run(res.lastInsertRowid, node.user_wallet, netReward, now, expiry);
            rewards.push({ wallet: node.user_wallet, gross: grossReward, net: netReward, reserve: infraReserve });
          }
        }
      }
      updateEpoch.run(id);
    });

    tx();

    return {
      epochId: id,
      totalRevenue,
      splits: { nodePool, treasuryPool, ecosystemPool },
      rewardsDistributed: rewards.length,
      details: rewards
    };
  }

  /**
   * Claim a Payout (Accounting Only)
   */
  claimPayout(nodeWallet, payoutId) {
    const now = Math.floor(Date.now() / 1000);
    const payout = this.db.prepare("SELECT * FROM payout_queue WHERE id = ? AND node_wallet = ?").get(payoutId, nodeWallet);

    if (!payout) throw new Error("Payout not found for this wallet");
    if (payout.status !== 'PENDING') throw new Error(`Payout already ${payout.status} `);

    if (now > payout.expires_at) {
      this.db.prepare("UPDATE payout_queue SET status = 'FORFEITED' WHERE id = ?").run(payoutId);
      throw new Error("Payout expired (48-day window passed) and is now FORFEITED");
    }

    this.db.prepare("UPDATE payout_queue SET status = 'CLAIMED' WHERE id = ?").run(payoutId);
    return { ok: true, payoutId, status: 'CLAIMED' };
  }

  /**
   * Get Treasury Balance (Available USDT)
   */
  getTreasuryAvailable() {
    const row = this.db.prepare("SELECT SUM(amount) as balance FROM revenue_events").get();
    return row.balance || 0;
  }

  /**
   * Monitor Treasury Balance (Financial Safety Monitor)
   */
  monitorTreasuryBalance() {
    const availableBalance = this.getTreasuryAvailable();

    // 1. Calculate Pending Withdrawals (Total Claimed but not yet fully withdrawn)
    const pendingRow = this.db.prepare(`
      SELECT SUM(amount - withdrawn_amount) as total 
      FROM payout_queue 
      WHERE status = 'CLAIMED'
    `).get();
    const pendingWithdrawals = pendingRow.total || 0;

    // 2. Get Safety Threshold
    const thresholdRow = this.db.prepare("SELECT value FROM system_config WHERE key = 'safety_threshold'").get();
    const safetyThreshold = thresholdRow ? parseFloat(thresholdRow.value) : 100.0;

    let alertTriggered = false;
    let alertDetails = [];

    // CHECK: available_balance >= pending_withdrawals
    if (availableBalance < pendingWithdrawals) {
      alertTriggered = true;
      alertDetails.push(`Solvency Check Failed: Available (${availableBalance.toFixed(2)}) < Pending (${pendingWithdrawals.toFixed(2)})`);
    }

    // ALERT_IF: balance < safety_threshold
    if (availableBalance < safetyThreshold) {
      alertTriggered = true;
      alertDetails.push(`Threshold Alert: Balance (${availableBalance.toFixed(2)}) < Safety Threshold (${safetyThreshold.toFixed(2)})`);
    }

    if (alertTriggered) {
      const reason = alertDetails.join("; ");
      console.warn(`[TREASURY MONITOR ERROR] ${reason}`);

      // ACTION: Pause withdrawals
      this.updateSystemConfig('withdrawals_paused', '1');

      // ACTION: Notify admin (Internal Flag)
      this.flagNode('PLATFORM_TREASURY', 'TREASURY_SAFETY_ALERT', reason);
    }

    return {
      status: alertTriggered ? 'ALERT' : 'OK',
      availableBalance,
      pendingWithdrawals,
      safetyThreshold,
      reason: alertTriggered ? alertDetails.join("; ") : "Healthy"
    };
  }

  /**
   * Withdraw Funds (Moves USDT)
   */
  withdrawFunds(nodeWallet, amount) {
    if (!this.isSystemSafe()) {
      throw new Error("Withdrawals are currently PAUSED for security/safety. Please try again later.");
    }
    const now = Math.floor(Date.now() / 1000);

    // 1. Check claimed balance
    const claimedRows = this.db.prepare(`
    SELECT * FROM payout_queue 
          WHERE node_wallet = ? AND status = 'CLAIMED'
          ORDER BY created_at ASC
      `).all(nodeWallet);

    const totalClaimed = claimedRows.reduce((sum, r) => sum + (r.amount - (r.withdrawn_amount || 0)), 0); // Ensure withdrawn_amount is treated as 0 if null

    if (amount > totalClaimed) {
      throw new Error(`Insufficient claimed balance.Available: ${totalClaimed.toFixed(2)} USDT`);
    }

    // 2. Check Treasury Guard
    const treasury = this.getTreasuryAvailable();
    if (amount > treasury) {
      throw new Error(`Withdraw Guard: Treasury lacks liquidity.Available: ${treasury.toFixed(2)} USDT`);
    }

    // 3. Process Withdraw (Deduct from claimed payouts FIFO)
    let remainingToWithdraw = amount;
    const tx = this.db.transaction(() => {
      for (const row of claimedRows) {
        if (remainingToWithdraw <= 0) break;

        const rowAvailable = row.amount - (row.withdrawn_amount || 0);
        const toDeduct = Math.min(rowAvailable, remainingToWithdraw);

        const newWithdrawn = (row.withdrawn_amount || 0) + toDeduct;
        const newStatus = (row.amount - newWithdrawn) < 0.0001 ? 'WITHDRAWN' : 'CLAIMED'; // Use a small epsilon for float comparison

        this.db.prepare(`
                  UPDATE payout_queue 
                  SET withdrawn_amount = ?, status = ?
      WHERE id = ?
        `).run(newWithdrawn, newStatus, row.id);

        remainingToWithdraw -= toDeduct;
      }

      // Record Withdrawal Event
      this.db.prepare(`
              INSERT INTO revenue_events(amount, token, source, payer_wallet, reference, created_at)
    VALUES(?, 'USDT', 'WITHDRAWAL', ?, ?, ?)
          `).run(-amount, nodeWallet, `withdrawal:${now} `, now);
    });

    tx();
    return { ok: true, withdrawn: amount, treasuryRemaining: treasury - amount };
  }

  /**
   * Auto-forfeit expired payouts (Day-1 Claims Monitor)
   */
  forfeitExpired() {
    const now = Math.floor(Date.now() / 1000);
    const result = this.db.prepare(`
          UPDATE payout_queue 
          SET status = 'FORFEITED' 
          WHERE status = 'PENDING' AND expires_at < ?
      `).run(now);

    if (result.changes > 0) {
      console.log(`[CLAIMS MONITOR] Auto-forfeited ${result.changes} expired claims.`);
    }
    return result.changes;
  }

  /**
   * Get Ledger (Read-only)
   */
  getLedger(epochId) {
    const id = epochId || this.currentEpochId;
    return this.db.prepare("SELECT * FROM reward_ledger WHERE epoch_id = ?").all(id);
  }

  /**
   * Record Authorization Failure (401 Monitoring)
   */
  recordAuthFailure(path, ip) {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare("INSERT INTO auth_failures (path, ip, created_at) VALUES (?, ?, ?)").run(path, ip, now);
    this.checkAuthSpikes();
  }

  /**
   * Check for Auth Spikes (Day-1 Security Requirement)
   */
  checkAuthSpikes() {
    const now = Math.floor(Date.now() / 1000);
    const window = 600; // 10 minutes
    const startTime = now - window;

    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM auth_failures 
      WHERE created_at > ?
    `).get(startTime);

    if (row.count > 10) { // Threshold: 10 failures in 10 minutes
      console.warn(`SECURITY ALERT: Auth Spike Detected! ${row.count} failures in 10m. Initiating Temporary Freeze.`);
      this.updateSystemConfig('security_freeze', '1');
      this.updateSystemConfig('withdrawals_paused', '1');
    }
  }

  /**
   * Get Payout Queue
   */
  getPayoutQueue(status = 'PENDING') {
    return this.db.prepare("SELECT * FROM payout_queue WHERE status = ?").all(status);
  }

  /**
   * Get epoch stats
   */
  getEpochStats(epochId) {
    const targetEpoch = epochId || this.currentEpochId;
    if (!targetEpoch) return { active_nodes: 0, revenue: 0 };

    // Check finalization status
    const epochMeta = this.db.prepare("SELECT is_finalized FROM epochs WHERE id = ?").get(targetEpoch);

    const stats = this.db.prepare(`
      SELECT
    COUNT(DISTINCT user_wallet) as active_nodes,
      SUM(ops) as total_ops,
      SUM(ops * weight) as total_weighted_ops
      FROM op_counts
      WHERE epoch_id = ?
      `).get(targetEpoch);

    const revenue = this.db.prepare(`
      SELECT SUM(amount) as total
      FROM revenue_events
      WHERE reference LIKE ?
      `).get(`epoch:${targetEpoch}% `);

    return {
      ...stats,
      revenue: revenue?.total || 0,
      epochId: targetEpoch,
      isFinalized: !!epochMeta?.is_finalized
    };
  }

  /**
   * Get all epochs summary
   */
  getAllEpochs() {
    const epochs = this.db.prepare("SELECT * FROM epochs ORDER BY id DESC").all();
    return epochs.map(e => this.getEpochStats(e.id));
  }

  /**
   * Monitor & Verify Heartbeat (Day-1 Security Enforcement)
   */
  processHeartbeatSecurity({ nodeWallet, message, signature, timestamp, nonce }) {
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp);

    // 1. Signature Validity
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== nodeWallet.toLowerCase()) {
        this.flagNode(nodeWallet, 'INVALID_SIGNER', `Rec: ${recoveredAddress}`);
        return { ok: false, error: "Signature mismatch", code: 401 };
      }
    } catch (e) {
      this.flagNode(nodeWallet, 'MALFORMED_SIGNATURE', e.message);
      return { ok: false, error: "Invalid signature format", code: 400 };
    }

    // 2. Timestamp Drift (+/- 5 minutes)
    if (Math.abs(now - ts) > 300) {
      this.flagNode(nodeWallet, 'TIMESTAMP_DRIFT', `Offset: ${now - ts}s`);
      return { ok: false, error: "Timestamp too far off", code: 400 };
    }

    // 3. Nonce Monotonicity
    const node = this.db.prepare("SELECT last_nonce, is_flagged FROM registered_nodes WHERE wallet = ?").get(nodeWallet);
    if (node) {
      if (node.is_flagged) {
        return { ok: false, error: "Node flagged for security review", code: 403 };
      }
      if (nonce <= node.last_nonce) {
        this.flagNode(nodeWallet, 'REPLAY_DETECTED', `Nonce: ${nonce} <= ${node.last_nonce}`);
        return { ok: false, error: "Replay detected: Nonce must be strictly increasing", code: 409 };
      }
    }

    return { ok: true };
  }

  /**
   * Flag node and alert (Day-1 Security Action)
   */
  flagNode(nodeWallet, reason, details) {
    const now = Math.floor(Date.now() / 1000);
    console.error(`SECURITY ALERT [Node ${nodeWallet}]: ${reason} - ${details}`);

    this.db.prepare(`
      INSERT INTO heartbeat_security_log (node_wallet, event_type, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(nodeWallet, reason, details, now);

    this.db.prepare(`
      UPDATE registered_nodes SET is_flagged = 1 WHERE wallet = ?
    `).run(nodeWallet);

    // Trigger SAFE_MODE for critical system anomalies
    const criticalReasons = ['REVENUE_ANOMALY', 'TREASURY_SAFETY_ALERT', 'EPOCH_LIFECYCLE_ANOMALY'];
    if (criticalReasons.includes(reason) || nodeWallet === 'PLATFORM_TREASURY') {
      this.enterSafeMode(reason);
    }
  }

  /**
   * Enter SAFE_MODE (Day-1 Emergency Protocol)
   */
  enterSafeMode(reason) {
    console.error(`!!! SYSTEM ENTERING SAFE_MODE: ${reason} !!!`);
    this.updateSystemConfig('system_state', 'SAFE_MODE');
    this.updateSystemConfig('withdrawals_paused', '1');
    this.updateSystemConfig('security_freeze', '1');
  }
}
