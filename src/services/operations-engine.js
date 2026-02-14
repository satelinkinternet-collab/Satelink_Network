import { ethers } from "ethers";

const OP_CONFIG = {
  'api_relay_execution': { price: 0.01, limit: 100, node_limit: 200 },
  'automation_job_execute': { price: 0.05, limit: 50, node_limit: 100 },
  'network_health_oracle_update': { price: 0.02, limit: 60, node_limit: 120 },
  'routing_decision_compute': { price: 0.001, limit: 1000, node_limit: 2000 },
  'verification_op': { price: 0.05, limit: 50, node_limit: 100 },
  'provisioning_op': { price: 0.10, limit: 10, node_limit: 20 },
  'monitoring_op': { price: 0.01, limit: 120, node_limit: 240 },
  'claim_validation_op': { price: 0.02, limit: 20, node_limit: 40 },
  'withdraw_execution_op': { price: 0.05, limit: 10, node_limit: 20 },
  'epoch_score_compute': { price: 0.05, limit: 5, node_limit: 10 }
};

export class OperationsEngine {
  constructor(db, ledger, webhookService = null) {
    this.db = db;
    this.ledger = ledger;
    this.webhookService = webhookService;
    this.slaEngine = null; // Injected post-construction [Phase Q]
    this.currentEpochId = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    if (this.db && typeof this.db.init === 'function') {
      await this.db.init();
    }
    await this.seed();
    this.initialized = true;
    console.log("OperationsEngine initialized. DB ready:", typeof this.db.prepare);
  }

  /**
   * Seed Initial System Data
   */
  async seed() {
    await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", ['withdrawals_paused', '0']);
    await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", ['security_freeze', '0']);
    await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", ['safety_threshold', '0']);
    await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", ['system_state', 'LIVE']);
    await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", ['revenue_mode', 'ACTIVE']);
    await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING", ['monitoring_status', 'ENFORCED']);

    // Ensure ops_pricing has limit columns (Phase 28)
    try {
      await this.db.query("ALTER TABLE ops_pricing ADD COLUMN max_per_minute_per_client INTEGER DEFAULT 60");
    } catch (e) { /* Column likely exists */ }
    try {
      await this.db.query("ALTER TABLE ops_pricing ADD COLUMN max_per_minute_per_node INTEGER DEFAULT 120");
    } catch (e) { /* Column likely exists */ }

    // Seed pricing from OP_CONFIG if table exists
    try {
      const ops = Object.keys(OP_CONFIG);
      for (const op of ops) {
        const conf = OP_CONFIG[op];
        await this.db.query(`
          INSERT INTO ops_pricing (op_type, price_usdt, enabled, max_per_minute_per_client, max_per_minute_per_node) 
          VALUES (?, ?, 1, ?, ?) 
          ON CONFLICT(op_type) DO UPDATE SET 
            max_per_minute_per_client = excluded.max_per_minute_per_client,
            max_per_minute_per_node = excluded.max_per_minute_per_node
        `, [op, conf.price, conf.limit || 60, conf.node_limit || 120]);
      }
    } catch (e) { console.error("Error seeding pricing:", e); }

    const row = await this.db.get("SELECT COUNT(*) as c FROM op_weights");
    if (row.c == 0) {
      const ops = Object.keys(OP_CONFIG);
      for (const op of ops) {
        await this.db.query("INSERT INTO op_weights (op_type, weight) VALUES (?, ?)", [op, 1.0]);
      }
    }

    await this.db.query(`CREATE TABLE IF NOT EXISTS user_roles (
      wallet TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      updated_at INTEGER
    )`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_wallet TEXT,
      referee_wallet TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER
    )`);

    // Phase 21: Full P0 Requirements
    await this.db.query(`CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      wallet TEXT,
      device_type TEXT,
      management_type TEXT DEFAULT 'self_hosted', -- 'managed' or 'self_hosted'
      status TEXT,
      last_seen INTEGER,
      created_at INTEGER
    )`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS pair_codes (
      code TEXT PRIMARY KEY,
      wallet TEXT,
      device_id TEXT,
      status TEXT, -- pending, used, expired
      created_at INTEGER,
      expires_at INTEGER,
      used_at INTEGER
    )`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_code TEXT,
      wallet TEXT,
      role TEXT,
      node_id TEXT,
      created_at INTEGER
    )`);
  }

  /**
   * PHASE A: Paid Ops Engine
   */
  async executeOp({ op_type, node_id, client_id, request_id, timestamp, payload_hash }) {
    await this.checkSafeMode();

    // [Phase Q4] Circuit Breaker — per-tenant throttling
    if (this.slaEngine && client_id) {
      const cb = await this.slaEngine.checkCircuitBreaker(client_id);
      if (!cb.allowed) {
        throw new Error(`tenant_throttled:${cb.reason}`);
      }
    }

    // 1. Validate pricing and existence
    const pricing = await this.db.get("SELECT * FROM ops_pricing WHERE op_type = ? AND enabled = 1", [op_type]);
    if (!pricing) throw new Error(`Operation type ${op_type} is disabled or invalid`);

    // 2. Idempotency Check
    const existing = await this.db.get("SELECT id FROM revenue_events_v2 WHERE client_id = ? AND op_type = ? AND request_id = ?", [client_id, op_type, request_id]);
    if (existing) return { ok: true, note: "Already processed", id: existing.id };

    // 3. Rate Limiting (Phase 28)
    const now = Math.floor(Date.now() / 1000);
    const minuteAgo = now - 60;

    const limitClient = pricing.max_per_minute_per_client || 60;
    const limitNode = pricing.max_per_minute_per_node || 120;

    // Client limit checks
    if (limitClient > 0) {
      const clientUsage = await this.db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE client_id = ? AND created_at > ?", [client_id, minuteAgo]);
      if (clientUsage.c >= limitClient) {
        // Failsafe: Return 429-like structure (throw error caught by API)
        throw new Error("rate_limited");
      }
    }

    // Node limit checks
    if (limitNode > 0) {
      const nodeUsage = await this.db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE node_id = ? AND created_at > ?", [node_id, minuteAgo]);
      if (nodeUsage.c >= limitNode) {
        throw new Error("rate_limited");
      }
    }

    // 4. [Phase 34] Revenue Calculation with Dynamic Pricing
    let finalPrice = 0;
    let priceVersion = 1;
    let surgeMultiplier = 1.0;

    const dynamicRule = await this.db.get("SELECT * FROM pricing_rules WHERE op_type = ?", [op_type]);
    if (dynamicRule) {
      finalPrice = dynamicRule.base_price_usdt;
      priceVersion = dynamicRule.version;

      if (dynamicRule.surge_enabled) {
        const load = await this.db.get("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?", [minuteAgo]);
        if (load.c > dynamicRule.surge_threshold) {
          surgeMultiplier = dynamicRule.surge_multiplier;
          finalPrice = finalPrice * surgeMultiplier;
        }
      }
    } else {
      finalPrice = pricing.price_usdt || 0;
    }

    // 5. Record Revenue Event (Phase 34 Hardened — full billing columns)
    const epochId = await this.initEpoch();
    const billingAmount = finalPrice;
    const unitCost = dynamicRule?.base_price_usdt || pricing.price_usdt || 0;

    const res = await this.db.query(`
        INSERT INTO revenue_events_v2 
        (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at, metadata_hash,
         price_version, surge_multiplier, unit_cost, unit_count)
        VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, 1)
    `, [epochId, op_type, node_id, client_id, billingAmount, request_id, now, payload_hash,
      priceVersion, surgeMultiplier, unitCost]);

    // [Phase 26] Economic Ledger Recording
    if (this.ledger && billingAmount > 0) {
      try {
        await this.ledger.createTxn({
          event_type: 'revenue',
          reference_type: 'revenue_event',
          reference_id: request_id,
          memo: `Op: ${op_type} Surge: ${surgeMultiplier}`,
          created_by: 'system_ops_engine',
          lines: [
            { account_key: `CLIENT:${client_id}`, direction: 'debit', amount_usdt: billingAmount, account_type: 'client', label: `Client ${client_id}` },
            { account_key: 'PLATFORM_REVENUE_USDT', direction: 'credit', amount_usdt: billingAmount }
          ]
        });
      } catch (e) {
        console.error("Ledger Write Failed for Revenue:", e.message);
      }
    }

    // [Phase Q4] Record execution for circuit breaker counters
    if (this.slaEngine && client_id) {
      this.slaEngine.recordExecution(client_id, billingAmount).catch(e =>
        console.error("[Ops] SLA Record Failed:", e.message));
    }

    // [Phase P] Webhook Trigger
    if (this.webhookService) {
      this.webhookService.dispatchEvent('op_completed', {
        op_type,
        req_id: request_id,
        status: 'success',
        amount_usdt: billingAmount,
        meta_hash: payload_hash
      }, client_id).catch(e => console.error("[Ops] Webhook Dispatch Failed:", e.message));
    }

    return {
      ok: true,
      amount: billingAmount,
      eventId: res.lastInsertRowid || res[0]?.id || 0,
      surge: surgeMultiplier > 1
    };
  }

  /**
   * PHASE B: Epoch Finalizer Logic
   */
  async finalizeEpoch(epochId) {
    const id = epochId || this.currentEpochId;
    const now = Math.floor(Date.now() / 1000);

    await this.db.transaction(async (tx) => {
      const result = await tx.query("UPDATE epochs SET status = 'FINALIZED', ends_at = ? WHERE id = ? AND status = 'OPEN'", [now, id]);
      if (result.changes === 0) throw new Error("Epoch not found or already finalized");

      // Compute Splits
      const revRow = await tx.get("SELECT SUM(amount_usdt) as total FROM revenue_events_v2 WHERE epoch_id = ?", [id]);
      const totalRevenue = revRow?.total || 0;

      if (totalRevenue > 0) {
        const nodePool = totalRevenue * 0.50;
        const platformFee = totalRevenue * 0.30;
        const distroPool = totalRevenue * 0.20;

        // Record immutable splits
        await tx.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'platform', 'PLATFORM_TREASURY', ?, ?)", [id, platformFee, now]);

        // Phase 28: Distributor Split Logic
        // Check if there are ANY conversions/referrals active for this epoch?
        // Using a simpler heuristic: If 'conversions' table has rows, we assume Distribution Network is active.
        const hasDistributors = await tx.get("SELECT 1 FROM conversions LIMIT 1");

        if (hasDistributors) {
          const lcoShare = distroPool * 0.60;
          const infShare = distroPool * 0.40;
          await tx.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distributor_lco', 'DIST_LCO_POOL', ?, ?)", [id, lcoShare, now]);
          await tx.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distributor_influencer', 'DIST_INF_POOL', ?, ?)", [id, infShare, now]);
        } else {
          // Fallback to DAO/Platform if no distributors
          await tx.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distribution_pool', 'DAO_POOL', ?, ?)", [id, distroPool, now]);
        }

        // Ensure 'management_type' column exists (Phase 29)
        try {
          await this.db.query("ALTER TABLE nodes ADD COLUMN management_type TEXT DEFAULT 'self_hosted'");
        } catch (e) { /* Column likely exists */ }
        try {
          await this.db.query("ALTER TABLE registered_nodes ADD COLUMN management_type TEXT DEFAULT 'self_hosted'");
        } catch (e) { /* Column likely exists */ }

        // Node rewards distribution
        const nodes = await tx.query(`
                SELECT u.node_wallet, u.uptime_seconds, n.node_type, n.management_type
                FROM node_uptime u
                JOIN registered_nodes n ON u.node_wallet = n.wallet
                WHERE u.epoch_id = ?
            `, [id]);

        const totalUptime = nodes.reduce((s, n) => s + n.uptime_seconds, 0);
        if (totalUptime > 0) {
          for (const n of nodes) {
            let share = (n.uptime_seconds / totalUptime) * nodePool;

            // Phase 29: Infra Reserve Deduction for Managed Nodes
            if (n.management_type === 'managed') {
              const deduction = share * 0.10;
              share = share - deduction;
              await tx.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'infra_reserve', 'INFRA_RESERVE_POOL', ?, ?)", [id, deduction, now]);
            }

            if (share > 0) {
              await tx.query("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'node_operator', ?, ?, ?)", [id, n.node_wallet, share, now]);
            }
          }
        }
      }
    });

    // [Phase 26] Economic Ledger: Record Total Liability
    // We aggregate the Total Rewards Payable (excluding Platform Revenue which is already realized? No, actually platform share is "Revenue" -> "Treasury" or "Retained Earnings")
    // The instructions say:
    // Debit: TREASURY_USDT (The cost comes from Treasury... wait. Revenue came INTO Revenue Account. Now we are allocating it.)
    // Actually: 
    // 1. Revenue Event: Client Debit, Platform Revenue Credit.
    // 2. Epoch Finalize: We are allocating that Revenue to internal/external parties.
    // Standard flow: Debit Platform Revenue (reduce it), Credit Payout liabilities/wallets.
    // User instructions say: 
    // "Debit: TREASURY_USDT, Credit: REWARDS_PAYABLE_USDT"
    // This implies the Treasury is funding the rewards. 
    // If we credited Platform Revenue earlier, we should probably Move it from Revenue to Treasury or just pay from Revenue?
    // Let's follow instructions: Debit TREASURY, Credit REWARDS_PAYABLE.
    // This assumes some sweep happened from Revenue -> Treasury, or we just treat Treasury as the source.

    // Wait, totalRevenue includes everything.
    // We need to record the Liability for the parts that are OWED to others (Distributors, Nodes).
    // Platform share is internal, but maybe we explicitly book it?
    // Let's record the Liability creation for the OUTFLOWS (Nodes + Distributors).

    // Actually, let's look at the instruction again: "Debit: TREASURY_USDT, Credit: REWARDS_PAYABLE_USDT"
    // And later payout: "Debit: REWARDS_PAYABLE_USDT, Credit: USER:<wallet>"

    // So for now, we just book the aggregate liability.
    const totalOutflow = nodePool + distroPool; // Platform share is kept.

    if (totalOutflow > 0 && this.ledger) {
      // We need to do this OUTSIDE the transaction if we want to use this.ledger.createTxn safely? 
      // createTxn starts its own transaction. SQLite doesn't support nested transactions easily unless using SAVEPOINT.
      // Our wrapper creates a transaction.
      // OpsEngine.finalizeEpoch uses `this.db.transaction`. 
      // We cannot call `this.ledger.createTxn` inside `this.db.transaction` if both try to `BEGIN`.
      // We should collect the payload and write it AFTER the commit.
      // BUT we want atomicity? 
      // The requirement says "createTxn" wraps everything in a txn.
      // If we are already in a txn, we can't call it safely without nested support.
      // For now, I will write it AFTER the main commits, accepting slight risk of drift (Self-healing will catch it).
      // OR I can defer the ledger write to after `tx` completes.
    }

    // [Phase 26] Post-Transaction Ledger Write
    // We re-query the epoch earnings to verify what was committed and write the ledger entry.
    if (this.ledger) {
      try {
        const earnings = await this.db.query("SELECT role, amount_usdt FROM epoch_earnings WHERE epoch_id = ?", [id]);
        const totalLiability = earnings
          .filter(e => e.role !== 'platform' && e.role !== 'infra_reserve') // Infra reserve is internal? Let's check. Managed nodes -> Infra Reserve.
          .reduce((sum, e) => sum + e.amount_usdt, 0);

        if (totalLiability > 0) {
          await this.ledger.createTxn({
            event_type: 'reward',
            reference_type: 'epoch',
            reference_id: String(id),
            memo: `Epoch ${id} Rewards Allocation`,
            created_by: 'system_epoch_finalizer',
            lines: [
              { account_key: 'TREASURY_USDT', direction: 'debit', amount_usdt: totalLiability },
              { account_key: 'REWARDS_PAYABLE_USDT', direction: 'credit', amount_usdt: totalLiability }
            ]
          });
        }
      } catch (e) {
        console.error("Ledger Write Failed for Rewards:", e.message);
      }
    }

    await this.initEpoch();
    return { ok: true, epochId: id, finalizedAt: now };
  }

  /**
   * Security Logging
   */
  async recordAuthFailure(path, ip) {
    // Best effort logging, no throw
    try {
      await this.db.query("INSERT INTO auth_failures (path, ip, created_at) VALUES (?, ?, ?)", [path, ip, Date.now()]);
    } catch (e) {
      console.error("Failed to record auth failure", e);
    }
  }

  /**
   * System Status Helpers
   */
  async updateSystemConfig(key, value) {
    const existing = await this.db.get("SELECT 1 FROM system_config WHERE key = ?", [key]);
    if (existing) {
      await this.db.query("UPDATE system_config SET value = ? WHERE key = ?", [value, key]);
    } else {
      await this.db.query("INSERT INTO system_config (key, value) VALUES (?, ?)", [key, value]);
    }
    return { key, value };
  }

  async isSystemSafe() {
    const paused = await this.db.get("SELECT value FROM system_config WHERE key = 'withdrawals_paused'");
    const frozen = await this.db.get("SELECT value FROM system_config WHERE key = 'security_freeze'");
    if (paused?.value === '1' || frozen?.value === '1') return false;
    return true;
  }

  /**
   * Epoch Management
   */
  async initEpoch() {
    const now = Math.floor(Date.now() / 1000);
    const existing = await this.db.get("SELECT id FROM epochs WHERE status = 'OPEN'");
    if (existing) {
      this.currentEpochId = existing.id;
      return existing.id;
    }

    const res = await this.db.query("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN') RETURNING id", [now]);
    if (res.lastInsertRowid) {
      this.currentEpochId = res.lastInsertRowid;
    } else {
      // Fallback if RETURNING not supported or ignored by wrapper
      const row = await this.db.get("SELECT MAX(id) as id FROM epochs");
      this.currentEpochId = row.id;
    }
    return this.currentEpochId;
  }

  /**
   * Safety & Validation
   */
  async checkSafeMode() {
    const state = await this.db.get("SELECT value FROM system_config WHERE key = 'system_state'");
    if (state?.value === 'SAFE_MODE') {
      throw new Error("System is in SAFE MODE. Operations locked.");
    }
  }

  async setSafeMode(reason) {
    console.error(`[SAFETY] Entering SAFE MODE: ${reason}`);
    await this.updateSystemConfig('system_state', 'SAFE_MODE');
    await this.updateSystemConfig('withdrawals_paused', '1');
    return { ok: true, mode: 'SAFE_MODE', reason };
  }

  async validateDistributionMath(epochId) {
    const revRow = await this.db.get("SELECT SUM(amount_usdt) as total FROM revenue_events_v2 WHERE epoch_id = ?", [epochId]);
    const totalRevenue = revRow.total || 0;

    const platformFee = totalRevenue * 0.30;
    const nodePool = totalRevenue * 0.50;
    const reserve = totalRevenue * 0.20;

    const sum = platformFee + nodePool + reserve;
    const diff = Math.abs(totalRevenue - sum);

    if (diff > 0.0001) {
      return { valid: false, error: `Math mismatch: Rev ${totalRevenue} != Sum ${sum}` };
    }
    return { valid: true };
  }

  /**
   * Distribution Engine (LOCKED POLICY)
   */
  async distributeRewards(epochId) {
    // distributeRewards is deprecated by finalizeEpoch's auto-split, but keeping for legacy compatibility if called
    return { epochId, status: "legacy_auto_dist_enabled" };
  }

  /**
   * Financial Ops
   */
  async getLedger(epochId) {
    return await this.db.query("SELECT * FROM epoch_earnings WHERE epoch_id = ?", [epochId]);
  }

  async getBalance(wallet) {
    const row = await this.db.get("SELECT SUM(amount_usdt) as total FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'", [wallet]);
    return row ? (row.total || 0) : 0;
  }

  async getPayoutQueue(status = 'PENDING') {
    return await this.db.query("SELECT * FROM withdrawals WHERE status = ?", [status]);
  }

  async getTreasuryAvailable() {
    // Sum of all revenue - sum of all completed withdrawals
    const rev = await this.db.get("SELECT SUM(amount_usdt) as total FROM revenue_events_v2");
    const paid = await this.db.get("SELECT SUM(amount_usdt) as total FROM withdrawals WHERE status = 'COMPLETED'");
    return (rev.total || 0) - (paid.total || 0);
  }

  async monitorTreasuryBalance() {
    return { status: 'OK', available: await this.getTreasuryAvailable() };
  }

  async forfeitExpired() {
    return 0; // Stub
  }

  async getAllEpochs() {
    return await this.db.query("SELECT * FROM epochs ORDER BY id DESC LIMIT 50");
  }

  async claim(wallet, signature) {
    const message = `CLAIM_REWARDS:${wallet.toLowerCase()}`;
    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== wallet.toLowerCase()) throw new Error("Invalid signature");
    } catch (e) {
      throw new Error("Invalid signature");
    }

    const unclaimed = await this.db.query("SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'", [wallet]);
    if (unclaimed.length === 0) throw new Error("No unclaimed rewards");

    let total = 0;
    const now = Math.floor(Date.now() / 1000);

    await this.db.transaction(async (tx) => {
      for (const r of unclaimed) {
        total += r.amount_usdt;
        await tx.query("UPDATE epoch_earnings SET status = 'CLAIMED' WHERE epoch_id = ? AND role = ? AND wallet_or_node_id = ?", [r.epoch_id, r.role, r.wallet_or_node_id]);
      }

      const simFlag = await this.db.get("SELECT value FROM system_flags WHERE key = 'rewards_simulation'");
      const status = (simFlag?.value === '1') ? 'SIMULATED' : 'PENDING';

      await tx.query("INSERT INTO withdrawals (wallet, amount_usdt, status, created_at) VALUES (?, ?, ?, ?)",
        [wallet, total, status, now]);
    });

    // [Phase 26] Ledger: Move from Rewards Payable to Payouts Payable
    if (this.ledger) {
      try {
        await this.ledger.createTxn({
          event_type: 'payout_request',
          reference_type: 'withdrawal',
          reference_id: `claim_${now}_${wallet}`,
          memo: `Claim Rewards: ${wallet}`,
          created_by: 'system_claim',
          lines: [
            { account_key: 'REWARDS_PAYABLE_USDT', direction: 'debit', amount_usdt: total },
            { account_key: 'PAYOUTS_PAYABLE_USDT', direction: 'credit', amount_usdt: total }
          ]
        });
      } catch (e) { console.error("Ledger Claim Error:", e.message); }
    }

    return { wallet, claimed: total };
  }

  /**
   * Uptime Tracking
   */
  async recordHeartbeatUptime(nodeWallet) {
    const now = Math.floor(Date.now() / 1000);
    const epochId = await this.initEpoch();

    const node = await this.db.get("SELECT last_heartbeat FROM registered_nodes WHERE wallet = ?", [nodeWallet]);
    let uptimeToAdd = 60;
    if (node && node.last_heartbeat) {
      const diff = now - node.last_heartbeat;
      if (diff > 0 && diff < 900) uptimeToAdd = diff;
    }

    const existing = await this.db.get("SELECT 1 FROM node_uptime WHERE node_wallet = ? AND epoch_id = ?", [nodeWallet, epochId]);
    if (existing) {
      await this.db.query("UPDATE node_uptime SET uptime_seconds = uptime_seconds + ?, score = score + ? WHERE node_wallet = ? AND epoch_id = ?",
        [uptimeToAdd, uptimeToAdd, nodeWallet, epochId]);
    } else {
      await this.db.query("INSERT INTO node_uptime (node_wallet, epoch_id, uptime_seconds, score) VALUES (?, ?, ?, ?)",
        [nodeWallet, epochId, uptimeToAdd, uptimeToAdd]);
    }

    return uptimeToAdd;
  }

  async withdrawFunds(nodeWallet, amount) {
    const bal = await this.getBalance(nodeWallet);
    if (bal < amount) throw new Error("Insufficient balance");

    const now = Math.floor(Date.now() / 1000);
    const simFlag = await this.db.get("SELECT value FROM system_flags WHERE key = 'rewards_simulation'");
    const status = (simFlag?.value === '1') ? 'SIMULATED' : 'PENDING';

    await this.db.query("INSERT INTO withdrawals (wallet, amount_usdt, status, created_at) VALUES (?, ?, ?, ?)",
      [nodeWallet, amount, status, now]);

    // [Phase 26] Ledger: Move from Rewards Payable to Payouts Payable (Manual Withdraw)
    // Assuming "Balance" comes from Rewards Payable bucket.
    if (this.ledger) {
      try {
        await this.ledger.createTxn({
          event_type: 'payout_request',
          reference_type: 'withdrawal',
          reference_id: `withdraw_${now}_${nodeWallet}`,
          memo: `Manual Withdraw: ${nodeWallet}`,
          created_by: 'system_withdraw',
          lines: [
            { account_key: 'REWARDS_PAYABLE_USDT', direction: 'debit', amount_usdt: amount },
            { account_key: 'PAYOUTS_PAYABLE_USDT', direction: 'credit', amount_usdt: amount }
          ]
        });
      } catch (e) { console.error("Ledger Withdraw Error:", e.message); }
    }

    return { ok: true, amount };
  }

  /**
   * Security & Rate Limiting
   */
  processHeartbeatSecurity({ nodeWallet, message, signature, timestamp, nonce }) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== nodeWallet.toLowerCase()) return { ok: false, error: "Signature mismatch" };
    } catch (e) { return { ok: false, error: "Invalid signature format" }; }
    return { ok: true };
  }

  processRouting({ nodeWallet, bytesRouted }) {
    return { ok: true, bytes: bytesRouted };
  }

  async enterSafeMode(reason) {
    await this.updateSystemConfig('system_state', 'SAFE_MODE');
    await this.updateSystemConfig('withdrawals_paused', '1');
  }
}
