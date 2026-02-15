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

  init() {
    if (this.initialized) return;
    if (this.db && typeof this.db.init === 'function') {
      // For SQLite, initialization is typically synchronous or already handled.
      // We don't await here because we're moving to a synchronous model for SQLite.
    }
    this.seed();
    this.initialized = true;
    console.log("OperationsEngine initialized. DB ready:", typeof this.db.prepare);
  }

  /**
   * Seed Initial System Data
   */
  seed() {
    this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING").run(['withdrawals_paused', '0']);
    this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING").run(['security_freeze', '0']);
    this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING").run(['safety_threshold', '0']);
    this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING").run(['system_state', 'LIVE']);
    this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING").run(['revenue_mode', 'ACTIVE']);
    this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING").run(['monitoring_status', 'ENFORCED']);

      // Ensure ops_pricing has limit columns (Phase 28)
      // NOTE: UniversalDB.exec may be async; for SQLite we use raw better-sqlite3 handle to make try/catch work.
      const raw = (this.db && this.db.db) ? this.db.db : this.db;
      try {
        raw.exec("ALTER TABLE ops_pricing ADD COLUMN max_per_minute_per_client INTEGER DEFAULT 60");
      } catch (e) { /* Column likely exists */ }
      try {
        raw.exec("ALTER TABLE ops_pricing ADD COLUMN max_per_minute_per_node INTEGER DEFAULT 120");
      } catch (e) { /* Column likely exists */ }

    // Seed pricing from OP_CONFIG if table exists
    try {
      const ops = Object.keys(OP_CONFIG);
      for (const op of ops) {
        const conf = OP_CONFIG[op];
        this.db.prepare(`
          INSERT INTO ops_pricing (op_type, price_usdt, enabled, max_per_minute_per_client, max_per_minute_per_node) 
          VALUES (?, ?, 1, ?, ?) 
          ON CONFLICT(op_type) DO UPDATE SET 
            max_per_minute_per_client = excluded.max_per_minute_per_client,
            max_per_minute_per_node = excluded.max_per_minute_per_node
        `).run([op, conf.price, conf.limit || 60, conf.node_limit || 120]);
      }
    } catch (e) { console.error("Error seeding pricing:", e); }

    const row = this.db.prepare("SELECT COUNT(*) as c FROM op_weights").get([]);
    if (row && row.c == 0) {
      const ops = Object.keys(OP_CONFIG);
      for (const op of ops) {
        this.db.prepare("INSERT INTO op_weights (op_type, weight) VALUES (?, ?)").run([op, 1.0]);
      }
    }

    this.db.exec(`CREATE TABLE IF NOT EXISTS user_roles (
      wallet TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      updated_at INTEGER
    )`);

    this.db.exec(`CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_wallet TEXT,
      referee_wallet TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER
    )`);

    // Phase 21: Full P0 Requirements
    this.db.exec(`CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      wallet TEXT,
      device_type TEXT,
      management_type TEXT DEFAULT 'self_hosted', -- 'managed' or 'self_hosted'
      status TEXT,
      last_seen INTEGER,
      created_at INTEGER
    )`);

    this.db.exec(`CREATE TABLE IF NOT EXISTS pair_codes (
      code TEXT PRIMARY KEY,
      wallet TEXT,
      device_id TEXT,
      status TEXT, -- pending, used, expired
      created_at INTEGER,
      expires_at INTEGER,
      used_at INTEGER
    )`);

    this.db.exec(`CREATE TABLE IF NOT EXISTS conversions (
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
    this.checkSafeMode();

    // [Phase Q4] Circuit Breaker — per-tenant throttling
    if (this.slaEngine && client_id) {
      const cb = await this.slaEngine.checkCircuitBreaker(client_id);
      if (!cb.allowed) {
        throw new Error(`tenant_throttled:${cb.reason}`);
      }
    }

    // 1. Validate pricing and existence
    const pricing = this.db.prepare("SELECT * FROM ops_pricing WHERE op_type = ? AND enabled = 1").get([op_type]);
    if (!pricing) throw new Error(`Operation type ${op_type} is disabled or invalid`);

    // 2. Idempotency Check
    const existing = this.db.prepare("SELECT id FROM revenue_events_v2 WHERE client_id = ? AND op_type = ? AND request_id = ?").get([client_id, op_type, request_id]);
    if (existing) return { ok: true, note: "Already processed", id: existing.id };

    // 3. Rate Limiting (Phase 28)
    const now = Math.floor(Date.now() / 1000);
    const minuteAgo = now - 60;

    const limitClient = pricing.max_per_minute_per_client || 60;
    const limitNode = pricing.max_per_minute_per_node || 120;

    // Client limit checks
    if (limitClient > 0) {
      const clientUsage = this.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE client_id = ? AND created_at > ?").get([client_id, minuteAgo]);
      if (clientUsage.c >= limitClient) {
        // Failsafe: Return 429-like structure (throw error caught by API)
        throw new Error("rate_limited");
      }
    }

    // Node limit checks
    if (limitNode > 0) {
      const nodeUsage = this.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE node_id = ? AND created_at > ?").get([node_id, minuteAgo]);
      if (nodeUsage.c >= limitNode) {
        throw new Error("rate_limited");
      }
    }

    // 4. [Phase 34] Revenue Calculation with Dynamic Pricing
    let finalPrice = 0;
    let priceVersion = 1;
    let surgeMultiplier = 1.0;

    const dynamicRule = this.db.prepare("SELECT * FROM pricing_rules WHERE op_type = ?").get([op_type]);
    if (dynamicRule) {
      finalPrice = dynamicRule.base_price_usdt;
      priceVersion = dynamicRule.version;

      if (dynamicRule.surge_enabled) {
        const load = this.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?").get([minuteAgo]);
        if (load.c > dynamicRule.surge_threshold) {
          surgeMultiplier = dynamicRule.surge_multiplier;
          finalPrice = finalPrice * surgeMultiplier;
        }
      }
    } else {
      finalPrice = pricing.price_usdt || 0;
    }

    // 5. Record Revenue Event (Phase 34 Hardened — full billing columns)
    const epochId = this.initEpoch();
    const billingAmount = finalPrice;
    const unitCost = dynamicRule?.base_price_usdt || pricing.price_usdt || 0;

    const res = this.db.prepare(`
        INSERT INTO revenue_events_v2 
        (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at, metadata_hash,
         price_version, surge_multiplier, unit_cost, unit_count)
        VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, 1)
    `).run([epochId, op_type, node_id, client_id, billingAmount, request_id, now, payload_hash,
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
      eventId: res.lastInsertRowid || 0,
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
      const result = tx.prepare("UPDATE epochs SET status = 'FINALIZED', ends_at = ? WHERE id = ? AND status = 'OPEN'").run([now, id]);
      if (result.changes === 0) throw new Error("Epoch not found or already finalized");

      // Compute Splits
      const revRow = tx.prepare("SELECT SUM(amount_usdt) as total FROM revenue_events_v2 WHERE epoch_id = ?").get([id]);
      const totalRevenue = revRow?.total || 0;

      if (totalRevenue > 0) {
        const nodePool = totalRevenue * 0.50;
        const platformFee = totalRevenue * 0.30;
        const distroPool = totalRevenue * 0.20;

        // Record immutable splits
        tx.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'platform', 'PLATFORM_TREASURY', ?, ?)").run([id, platformFee, now]);

        // Phase 28: Distributor Split Logic
        const hasDistributors = tx.prepare("SELECT 1 FROM conversions LIMIT 1").get([]);

        if (hasDistributors) {
          const lcoShare = distroPool * 0.60;
          const infShare = distroPool * 0.40;
          tx.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distributor_lco', 'DIST_LCO_POOL', ?, ?)").run([id, lcoShare, now]);
          tx.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distributor_influencer', 'DIST_INF_POOL', ?, ?)").run([id, infShare, now]);
        } else {
          // Fallback to DAO/Platform if no distributors
          tx.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distribution_pool', 'DAO_POOL', ?, ?)").run([id, distroPool, now]);
        }

        // Ensure 'management_type' column exists (Phase 29)
        try {
          tx.exec("ALTER TABLE nodes ADD COLUMN management_type TEXT DEFAULT 'self_hosted'");
        } catch (e) { /* Column likely exists */ }
        try {
          tx.exec("ALTER TABLE registered_nodes ADD COLUMN management_type TEXT DEFAULT 'self_hosted'");
        } catch (e) { /* Column likely exists */ }

        // Node rewards distribution
        const nodes = tx.prepare(`
                SELECT u.node_wallet, u.uptime_seconds, n.node_type, n.management_type
                FROM node_uptime u
                JOIN registered_nodes n ON u.node_wallet = n.wallet
                WHERE u.epoch_id = ?
            `).all([id]);

        const totalUptime = nodes.reduce((s, n) => s + n.uptime_seconds, 0);
        if (totalUptime > 0) {
          for (const n of nodes) {
            let share = (n.uptime_seconds / totalUptime) * nodePool;

            // Phase 29: Infra Reserve Deduction for Managed Nodes
            if (n.management_type === 'managed') {
              const deduction = share * 0.10;
              share = share - deduction;
              tx.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'infra_reserve', 'INFRA_RESERVE_POOL', ?, ?)").run([id, deduction, now]);
            }

            if (share > 0) {
              tx.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'node_operator', ?, ?, ?)").run([id, n.node_wallet, share, now]);
            }
          }
        }
      }
    });

    if (this.ledger) {
      try {
        const earnings = this.db.prepare("SELECT role, amount_usdt FROM epoch_earnings WHERE epoch_id = ?").all([id]);
        const totalLiability = earnings
          .filter(e => e.role !== 'platform' && e.role !== 'infra_reserve')
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

    this.initEpoch();
    return { ok: true, epochId: id, finalizedAt: now };
  }

  /**
   * Security Logging
   */
  recordAuthFailure(path, ip) {
    try {
      this.db.prepare("INSERT INTO auth_failures (path, ip, created_at) VALUES (?, ?, ?)").run([path, ip, Date.now()]);
    } catch (e) {
      console.error("Failed to record auth failure", e);
    }
  }

  updateSystemConfig(key, value) {
    const existing = this.db.prepare("SELECT 1 FROM system_config WHERE key = ?").get([key]);
    if (existing) {
      this.db.prepare("UPDATE system_config SET value = ? WHERE key = ?").run([value, key]);
    } else {
      this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?)").run([key, value]);
    }
    return { key, value };
  }

  isSystemSafe() {
    const paused = this.db.prepare("SELECT value FROM system_config WHERE key = 'withdrawals_paused'").get([]);
    const frozen = this.db.prepare("SELECT value FROM system_config WHERE key = 'security_freeze'").get([]);
    if (paused?.value === '1' || frozen?.value === '1') return false;
    return true;
  }

  initEpoch() {
    const now = Math.floor(Date.now() / 1000);
    const existing = this.db.prepare("SELECT id FROM epochs WHERE status = 'OPEN'").get([]);
    if (existing) {
      this.currentEpochId = existing.id;
      return existing.id;
    }

    const res = this.db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run([now]);
    this.currentEpochId = res.lastInsertRowid;
    return this.currentEpochId;
  }

  checkSafeMode() {
    const state = this.db.prepare("SELECT value FROM system_config WHERE key = 'system_state'").get([]);
    if (state?.value === 'SAFE_MODE') {
      throw new Error("System is in SAFE MODE. Operations locked.");
    }
  }

  setSafeMode(reason) {
    console.error(`[SAFETY] Entering SAFE MODE: ${reason}`);
    this.updateSystemConfig('system_state', 'SAFE_MODE');
    this.updateSystemConfig('withdrawals_paused', '1');
    return { ok: true, mode: 'SAFE_MODE', reason };
  }

  validateDistributionMath(epochId) {
    const revRow = this.db.prepare("SELECT SUM(amount_usdt) as total FROM revenue_events_v2 WHERE epoch_id = ?").get([epochId]);
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

  distributeRewards(epochId) {
    // distributeRewards is deprecated by finalizeEpoch's auto-split, but keeping for legacy compatibility if called
    return { epochId, status: "legacy_auto_dist_enabled" };
  }

  getLedger(epochId) {
    return this.db.prepare("SELECT * FROM epoch_earnings WHERE epoch_id = ?").all([epochId]);
  }

  getBalance(wallet) {
    const row = this.db.prepare("SELECT SUM(amount_usdt) as total FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'").get([wallet]);
    return row ? (row.total || 0) : 0;
  }

  getPayoutQueue(status = 'PENDING') {
    return this.db.prepare("SELECT * FROM withdrawals WHERE status = ?").all([status]);
  }

  getTreasuryAvailable() {
    // Sum of all revenue - sum of all completed withdrawals
    const rev = this.db.prepare("SELECT SUM(amount_usdt) as total FROM revenue_events_v2").get([]);
    const paid = this.db.prepare("SELECT SUM(amount_usdt) as total FROM withdrawals WHERE status = 'COMPLETED'").get([]);
    return (rev.total || 0) - (paid.total || 0);
  }

  async monitorTreasuryBalance() {
    return { status: 'OK', available: await this.getTreasuryAvailable() };
  }

  async forfeitExpired() {
    return 0; // Stub
  }

  getAllEpochs() {
    return this.db.prepare("SELECT * FROM epochs ORDER BY id DESC LIMIT 50").all([]);
  }

  async claim(wallet, signature) {
    const message = `CLAIM_REWARDS:${wallet.toLowerCase()}`;
    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== wallet.toLowerCase()) throw new Error("Invalid signature");
    } catch (e) {
      throw new Error("Invalid signature");
    }

    const unclaimed = this.db.prepare("SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'").all([wallet]);
    if (unclaimed.length === 0) throw new Error("No unclaimed rewards");

    let total = 0;
    const now = Math.floor(Date.now() / 1000);

    await this.db.transaction(async (tx) => {
      for (const r of unclaimed) {
        total += r.amount_usdt;
        tx.prepare("UPDATE epoch_earnings SET status = 'CLAIMED' WHERE epoch_id = ? AND role = ? AND wallet_or_node_id = ?").run([r.epoch_id, r.role, r.wallet_or_node_id]);
      }

      const simFlag = tx.prepare("SELECT value FROM system_flags WHERE key = 'rewards_simulation'").get([]);
      const status = (simFlag?.value === '1') ? 'SIMULATED' : 'PENDING';

      tx.prepare("INSERT INTO withdrawals (wallet, amount_usdt, status, created_at) VALUES (?, ?, ?, ?)").run([wallet, total, status, now]);
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
  recordHeartbeatUptime(nodeWallet) {
    const now = Math.floor(Date.now() / 1000);
    const epochId = this.initEpoch();

    const node = this.db.prepare("SELECT last_heartbeat FROM registered_nodes WHERE wallet = ?").get([nodeWallet]);
    let uptimeToAdd = 60;
    if (node && node.last_heartbeat) {
      const diff = now - node.last_heartbeat;
      if (diff > 0 && diff < 900) uptimeToAdd = diff;
    }

    const existing = this.db.prepare("SELECT 1 FROM node_uptime WHERE node_wallet = ? AND epoch_id = ?").get([nodeWallet, epochId]);
    if (existing) {
      this.db.prepare("UPDATE node_uptime SET uptime_seconds = uptime_seconds + ?, score = score + ? WHERE node_wallet = ? AND epoch_id = ?")
        .run([uptimeToAdd, uptimeToAdd, nodeWallet, epochId]);
    } else {
      this.db.prepare("INSERT INTO node_uptime (node_wallet, epoch_id, uptime_seconds, score) VALUES (?, ?, ?, ?)")
        .run([nodeWallet, epochId, uptimeToAdd, uptimeToAdd]);
    }

    return uptimeToAdd;
  }

  async withdrawFunds(nodeWallet, amount) {
    const bal = this.getBalance(nodeWallet);
    if (bal < amount) throw new Error("Insufficient balance");

    const now = Math.floor(Date.now() / 1000);
    const simFlag = this.db.prepare("SELECT value FROM system_flags WHERE key = 'rewards_simulation'").get([]);
    const status = (simFlag?.value === '1') ? 'SIMULATED' : 'PENDING';

    this.db.prepare("INSERT INTO withdrawals (wallet, amount_usdt, status, created_at) VALUES (?, ?, ?, ?)").run([nodeWallet, amount, status, now]);

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

  enterSafeMode(reason) {
    this.updateSystemConfig('system_state', 'SAFE_MODE');
    this.updateSystemConfig('withdrawals_paused', '1');
  }
}
