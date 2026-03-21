import { ethers } from "ethers";
import crypto from "crypto";

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
  'epoch_score_compute': { price: 0.05, limit: 5, node_limit: 10 },
  'ai_inference': { price: 0.05, limit: 60, node_limit: 120 },
  'rpc_call': { price: 0.01, limit: 100, node_limit: 200 },
  'ai_task': { price: 0.05, limit: 60, node_limit: 120 }
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
    await this.seed();
    this.initialized = true;
    console.log("OperationsEngine initialized. DB ready:", typeof this.db?.prepare);
  }

  /**
   * Seed Initial System Data
   */
  async seed() {
    // Tables system_config, ops_pricing, op_weights handled by init.sql
    /*
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS ops_pricing (
        op_type TEXT PRIMARY KEY,
        price_usdt REAL NOT NULL,
        enabled INTEGER DEFAULT 1,
        max_per_minute_per_client INTEGER DEFAULT 60,
        max_per_minute_per_node INTEGER DEFAULT 120
      );
      CREATE TABLE IF NOT EXISTS op_weights (
        op_type TEXT PRIMARY KEY,
        weight REAL NOT NULL DEFAULT 1.0
      );
    `);
    */

    await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").run(['withdrawals_paused', '0']);
    await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").run(['security_freeze', '0']);
    await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").run(['safety_threshold', '0']);
    await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").run(['system_state', 'LIVE']);
    await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").run(['revenue_mode', 'ACTIVE']);
    await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").run(['monitoring_status', 'ENFORCED']);

    // Seed pricing from OP_CONFIG if table exists
    try {
      const ops = Object.keys(OP_CONFIG);
      for (const op of ops) {
        const conf = OP_CONFIG[op];
        await this.db.prepare(`
          INSERT INTO ops_pricing (op_type, price_usdt, enabled, max_per_minute_per_client, max_per_minute_per_node) 
          VALUES (?, ?, 1, ?, ?) 
          ON CONFLICT(op_type) DO UPDATE SET 
            enabled = 1,
            max_per_minute_per_client = EXCLUDED.max_per_minute_per_client,
            max_per_minute_per_node = EXCLUDED.max_per_minute_per_node
        `).run([op, conf.price, conf.limit || 60, conf.node_limit || 120]);
      }
    } catch (e) { console.error("Error seeding pricing:", e); }

    try {
      const ops = Object.keys(OP_CONFIG);
      for (const op of ops) {
        await this.db.prepare(`
          INSERT INTO op_weights (op_type, weight) VALUES (?, ?)
          ON CONFLICT(op_type) DO UPDATE SET weight = EXCLUDED.weight
        `).run([op, 1.0]);
      }
    } catch (e) {
      console.error("Error seeding op_weights:", e);
    }

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS user_roles (
      wallet TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      updated_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_wallet TEXT,
      referee_wallet TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      created_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      wallet TEXT,
      device_type TEXT,
      management_type TEXT DEFAULT 'self_hosted',
      status TEXT,
      last_seen BIGINT,
      created_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS pair_codes (
      code TEXT PRIMARY KEY,
      wallet TEXT,
      device_id TEXT,
      status TEXT,
      created_at BIGINT,
      expires_at BIGINT,
      used_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      ref_code TEXT,
      wallet TEXT,
      role TEXT,
      node_id TEXT,
      created_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password_hash TEXT,
      role TEXT,
      created_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS user_settings (
      wallet TEXT PRIMARY KEY,
      ui_mode TEXT DEFAULT 'SIMPLE',
      created_at BIGINT,
      updated_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS public_identity (
      wallet TEXT PRIMARY KEY,
      public_id TEXT UNIQUE,
      created_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS onboarding_state (
      wallet TEXT PRIMARY KEY,
      step_completed_json TEXT,
      completed_at BIGINT
    )`);
    */

    /*
    await this.db.exec(`CREATE TABLE IF NOT EXISTS balances (
      wallet TEXT PRIMARY KEY,
      amount_usdt REAL DEFAULT 0,
      updated_at BIGINT
    )`);
    */
  }

  /**
   * PHASE A: Paid Ops Engine
   */
  async executeOp(params) {
    console.log('[REVENUE_TRACE] operation_received');
    const { op_type, node_id, client_id, request_id, timestamp, payload_hash, amount_usdt } = params;
    await this.checkSafeMode();

    if (this.slaEngine && client_id) {
      const cb = await this.slaEngine.checkCircuitBreaker(client_id);
      if (!cb.allowed) {
        throw new Error(`tenant_throttled:${cb.reason}`);
      }
    }

    // 1. Validate pricing and existence
    const pricing = await this.db.prepare("SELECT * FROM ops_pricing WHERE op_type = ? AND enabled = 1").get([op_type]);
    if (!pricing) throw new Error(`Operation type ${op_type} is disabled or invalid`);

    // 2. Idempotency Check
    const existing = await this.db.prepare("SELECT id FROM revenue_events_v2 WHERE client_id = ? AND op_type = ? AND request_id = ?").get([client_id, op_type, request_id]);
    if (existing) return { ok: true, note: "Already processed", id: existing.id };

    console.log(`[E2E] ✅ job accepted: ${op_type} for client ${client_id}`);
    console.log('[REVENUE_TRACE] execution_completed');

    // 3. Rate Limiting
    const now = Math.floor(Date.now() / 1000);
    const minuteAgo = now - 60;
    const limitClient = pricing.max_per_minute_per_client || 60;
    const limitNode = pricing.max_per_minute_per_node || 120;

    if (limitClient > 0) {
      const clientUsage = await this.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE client_id = ? AND created_at > ?").get([client_id, minuteAgo]);
      if (clientUsage.c >= limitClient) throw new Error("rate_limited");
    }
    if (limitNode > 0) {
      const nodeUsage = await this.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE node_id = ? AND created_at > ?").get([node_id, minuteAgo]);
      if (nodeUsage.c >= limitNode) throw new Error("rate_limited");
    }

    // 4. Revenue Calculation
    let finalPrice = Number(amount_usdt || 0);
    let priceVersion = 1;
    let surgeMultiplier = 1.0;

    if (finalPrice <= 0) {
      const dynamicRule = await this.db.prepare("SELECT * FROM pricing_rules WHERE op_type = ?").get([op_type]);
      if (dynamicRule) {
        finalPrice = dynamicRule.base_price_usdt;
        priceVersion = dynamicRule.version;
        if (dynamicRule.surge_enabled) {
          const load = await this.db.prepare("SELECT COUNT(*) as c FROM revenue_events_v2 WHERE created_at > ?").get([minuteAgo]);
          if (load.c > dynamicRule.surge_threshold) {
            surgeMultiplier = dynamicRule.surge_multiplier;
            finalPrice = finalPrice * surgeMultiplier;
          }
        }
      } else {
        finalPrice = pricing.price_usdt || 0;
      }
    }

    // PHASE 10: Balance Enforcement
    if (this.ledger && client_id && finalPrice > 0) {
      const currentBal = await this.ledger.getBalance(`CLIENT:${client_id}`);
      // In our ledger, Credits are negative, Debits are positive.
      // Available funds = Credits - Debits = -currentBal.
      const available = -currentBal;
      if (available < finalPrice) {
        console.error(`[Ops] ❌ Insufficient balance for client ${client_id}: available ${available}, required ${finalPrice}`);
        throw new Error("insufficient_balance");
      }
    }

    // 5. Record Revenue Event
    const epochId = await this.initEpoch();
    const billingAmount = finalPrice;
    const unitCost = pricing.price_usdt || 0;

    const res = await this.db.prepare(`
        INSERT INTO revenue_events_v2
        (epoch_id, op_type, node_id, client_id, amount_usdt, status, request_id, created_at, metadata_hash,
         price_version, surge_multiplier, unit_cost, unit_count)
        VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, 1)
    `).run([epochId, op_type, node_id, client_id, billingAmount, request_id, now, payload_hash,
      priceVersion, surgeMultiplier, unitCost]);

    console.log(`[E2E] ✅ job completed & revenue recorded: ${billingAmount} USDT (request: ${request_id})`);

    console.log('[REVENUE_TRACE] revenue_recorded');

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
      } catch (e) { console.error("Ledger Write Failed for Revenue:", e.message); }
    }

    if (this.slaEngine && client_id) {
      this.slaEngine.recordExecution(client_id, billingAmount).catch(e =>
        console.error("[Ops] SLA Record Failed:", e.message));
    }

    if (this.webhookService) {
      this.webhookService.dispatchEvent('op_completed', {
        op_type,
        req_id: request_id,
        status: 'success',
        amount_usdt: billingAmount,
        meta_hash: payload_hash
      }, client_id).catch(e => console.error("[Ops] Webhook Dispatch Failed:", e.message));
    }

    return { ok: true, amount: billingAmount, eventId: res.lastInsertRowid || 0, surge: surgeMultiplier > 1 };
  }

  async finalizeEpoch(epochId) {
    const id = epochId || this.currentEpochId;
    const now = Math.floor(Date.now() / 1000);
    await (this.db.transaction(async () => {
      const result = await this.db.prepare("UPDATE epochs SET status = 'FINALIZED', ends_at = ? WHERE id = ? AND status = 'OPEN'").run([now, id]);
      if (result.changes === 0) throw new Error("Epoch not found or already finalized");
      const revRow = await this.db.prepare("SELECT SUM(amount_usdt) as total FROM revenue_events_v2 WHERE epoch_id = ?").get([id]);
      const totalRevenue = revRow?.total || 0;
      if (totalRevenue > 0) {
        const nodePool = totalRevenue * 0.50;
        const platformFee = totalRevenue * 0.30;
        const distroPool = totalRevenue * 0.20;
        await this.db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'platform', 'PLATFORM_TREASURY', ?, ?)").run([id, platformFee, now]);
        const hasDistributors = await this.db.prepare("SELECT 1 FROM conversions LIMIT 1").get([]);
        if (hasDistributors) {
          const lcoShare = distroPool * 0.60;
          const infShare = distroPool * 0.40;
          await this.db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distributor_lco', 'DIST_LCO_POOL', ?, ?)").run([id, lcoShare, now]);
          await this.db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distributor_influencer', 'DIST_INF_POOL', ?, ?)").run([id, infShare, now]);
        } else {
          await this.db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'distribution_pool', 'DAO_POOL', ?, ?)").run([id, distroPool, now]);
        }
        const nodes = await this.db.prepare(`SELECT u.node_wallet, u.uptime_seconds, n.node_type, n.management_type FROM node_uptime u JOIN registered_nodes n ON u.node_wallet = n.wallet WHERE u.epoch_id = ?`).all([id]);
        const totalUptime = nodes.reduce((s, n) => s + n.uptime_seconds, 0);
        if (totalUptime > 0) {
          for (const n of nodes) {
            let share = (n.uptime_seconds / totalUptime) * nodePool;
            if (n.management_type === 'managed') {
              const deduction = share * 0.10;
              share = share - deduction;
              await this.db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'infra_reserve', 'INFRA_RESERVE_POOL', ?, ?)").run([id, deduction, now]);
            }
            if (share > 0) {
              await this.db.prepare("INSERT INTO epoch_earnings (epoch_id, role, wallet_or_node_id, amount_usdt, created_at) VALUES (?, 'node_operator', ?, ?, ?)").run([id, n.node_wallet, share, now]);
            }
          }
        }
      }
    }))();
    
    console.log('[REVENUE_TRACE] epoch_updated');

    if (this.ledger) {
      try {
        const earnings = await this.db.prepare("SELECT role, amount_usdt FROM epoch_earnings WHERE epoch_id = ?").all([id]);
        const totalLiability = earnings.filter(e => e.role !== 'platform' && e.role !== 'infra_reserve').reduce((sum, e) => sum + e.amount_usdt, 0);
        if (totalLiability > 0) {
          await this.ledger.createTxn({ event_type: 'reward', reference_type: 'epoch', reference_id: String(id), memo: `Epoch ${id} Rewards Allocation`, created_by: 'system_epoch_finalizer', lines: [{ account_key: 'TREASURY_USDT', direction: 'debit', amount_usdt: totalLiability }, { account_key: 'REWARDS_PAYABLE_USDT', direction: 'credit', amount_usdt: totalLiability }] });
        }
      } catch (e) { console.error("Ledger Write Failed for Rewards:", e.message); }
    }
    await this.initEpoch();
    console.log(`[E2E] ✅ epoch closed & rewards allocated: Epoch ${id}`);
    return { ok: true, epochId: id, finalizedAt: now };
  }

  async recordAuthFailure(path, ip) {
    try { await this.db.prepare("INSERT INTO auth_failures (path, ip, created_at) VALUES (?, ?, ?)").run([path, ip, Date.now()]); } catch (e) { }
  }

  async updateSystemConfig(key, value) {
    const existing = await this.db.prepare("SELECT 1 FROM system_config WHERE key = ?").get([key]);
    if (existing) { await this.db.prepare("UPDATE system_config SET value = ? WHERE key = ?").run([value, key]); }
    else { await this.db.prepare("INSERT INTO system_config (key, value) VALUES (?, ?)").run([key, value]); }
    return { key, value };
  }

  async isSystemSafe() {
    const paused = await this.db.prepare("SELECT value FROM system_config WHERE key = 'withdrawals_paused'").get([]);
    const frozen = await this.db.prepare("SELECT value FROM system_config WHERE key = 'security_freeze'").get([]);
    return !(paused?.value === '1' || frozen?.value === '1');
  }

  async initEpoch() {
    const now = Math.floor(Date.now() / 1000);
    const existing = await this.db.prepare("SELECT id FROM epochs WHERE status = 'OPEN'").get([]);
    if (existing) { this.currentEpochId = existing.id; return existing.id; }
    const res = await this.db.prepare("INSERT INTO epochs (starts_at, status) VALUES (?, 'OPEN')").run([now]);
    this.currentEpochId = res.lastInsertRowid;
    return this.currentEpochId;
  }

  async checkSafeMode() {
    const state = await this.db.prepare("SELECT value FROM system_config WHERE key = 'system_state'").get([]);
    if (state?.value === 'SAFE_MODE') throw new Error("System is in SAFE MODE. Operations locked.");
  }

  async setSafeMode(reason) {
    await this.updateSystemConfig('system_state', 'SAFE_MODE');
    await this.updateSystemConfig('withdrawals_paused', '1');
    return { ok: true, mode: 'SAFE_MODE', reason };
  }

  async getBalance(wallet) {
    const row = await this.db.prepare("SELECT SUM(amount_usdt) as total FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'").get([wallet]);
    return row ? (row.total || 0) : 0;
  }

  async claim(wallet, signature) {
    const message = `CLAIM_REWARDS:${wallet.toLowerCase()}`;
    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== wallet.toLowerCase()) throw new Error("Invalid signature");
    } catch (e) { throw new Error("Invalid signature"); }
    const unclaimed = await this.db.prepare("SELECT * FROM epoch_earnings WHERE wallet_or_node_id = ? AND status = 'UNPAID'").all([wallet]);
    if (unclaimed.length === 0) throw new Error("No unclaimed rewards");
    let total = 0;
    const now = Math.floor(Date.now() / 1000);
    await (this.db.transaction(async () => {
      for (const r of unclaimed) {
        total += r.amount_usdt;
        await this.db.prepare("UPDATE epoch_earnings SET status = 'CLAIMED' WHERE epoch_id = ? AND role = ? AND wallet_or_node_id = ?").run([r.epoch_id, r.role, r.wallet_or_node_id]);
      }
      const simFlag = await this.db.prepare("SELECT value FROM system_config WHERE key = 'rewards_simulation'").get([]);
      const status = (simFlag?.value === '1') ? 'SIMULATED' : 'PENDING';
      const withdrawalId = crypto.randomUUID();
      await this.db.prepare("INSERT INTO withdrawals (id, wallet, amount_usdt, status, retry_count, created_at) VALUES (?, ?, ?, ?, ?, ?)").run([withdrawalId, wallet, total, status, 0, now]);
    }))();
    console.log(`[E2E] ✅ claim created: ${total} USDT for ${wallet}`);
    return { wallet, claimed: total };
  }
}
