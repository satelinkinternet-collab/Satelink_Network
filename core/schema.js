export function attachSchema(db) {
  const ensure = (sql) => {
    try {
      db.prepare(sql).run();
    } catch (e) {
      // Ignore errors for existing tables/columns
    }
  };

  const hasCol = (table, col) => {
    try {
      const rows = db.prepare(`PRAGMA table_info(${table})`).all();
      return rows.some((r) => r.name === col);
    } catch (e) {
      return false;
    }
  };

  // Create tables
  ensure(`CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS op_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch_id INTEGER,
    user_wallet TEXT,
    op_type TEXT,
    ops INTEGER,
    weight REAL,
    created_at INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS revenue_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL,
    token TEXT,
    source TEXT,
    created_at INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS registered_nodes (
    wallet TEXT PRIMARY KEY,
    is_flagged INTEGER DEFAULT 0,
    last_nonce INTEGER DEFAULT -1
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS enterprise_clients (
    client_id TEXT PRIMARY KEY,
    company_name TEXT,
    wallet_address TEXT,
    plan_type TEXT DEFAULT 'BASIC',
    rate_per_op REAL DEFAULT 0.002,
    monthly_minimum REAL DEFAULT 1000,
    deposit_balance REAL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at INTEGER
  )`);

  ensure(`CREATE TABLE IF NOT EXISTS enterprise_api_keys (
    api_key TEXT PRIMARY KEY,
    client_id TEXT,
    created_at INTEGER,
    FOREIGN KEY(client_id) REFERENCES enterprise_clients(client_id)
  )`);

  // Ensure columns (to handle schema evolution in prod)
  if (!hasCol("op_counts", "epoch_id")) ensure(`ALTER TABLE op_counts ADD COLUMN epoch_id INTEGER`);
  if (!hasCol("op_counts", "user_wallet")) ensure(`ALTER TABLE op_counts ADD COLUMN user_wallet TEXT`);
  if (!hasCol("op_counts", "op_type")) ensure(`ALTER TABLE op_counts ADD COLUMN op_type TEXT`);
  if (!hasCol("op_counts", "ops")) ensure(`ALTER TABLE op_counts ADD COLUMN ops INTEGER`);
  if (!hasCol("op_counts", "weight")) ensure(`ALTER TABLE op_counts ADD COLUMN weight REAL`);
  if (!hasCol("op_counts", "created_at")) ensure(`ALTER TABLE op_counts ADD COLUMN created_at INTEGER`);

  if (!hasCol("revenue_events", "amount")) ensure(`ALTER TABLE revenue_events ADD COLUMN amount REAL`);
  if (!hasCol("revenue_events", "token")) ensure(`ALTER TABLE revenue_events ADD COLUMN token TEXT`);
  if (!hasCol("revenue_events", "source")) ensure(`ALTER TABLE revenue_events ADD COLUMN source TEXT`);
  if (!hasCol("revenue_events", "created_at")) ensure(`ALTER TABLE revenue_events ADD COLUMN created_at INTEGER`);

  // Feature: link revenue event to enterprise
  if (!hasCol("revenue_events", "enterprise_id")) ensure(`ALTER TABLE revenue_events ADD COLUMN enterprise_id TEXT`);

  // ═══════════════════════════════════════════════════════════
  // Revenue / Financial
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS revenue_events_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch_id INTEGER, op_type TEXT NOT NULL, node_id TEXT, client_id TEXT,
      amount_usdt REAL NOT NULL, status TEXT DEFAULT 'success', request_id TEXT,
      created_at BIGINT NOT NULL, metadata_hash TEXT, price_version INTEGER,
      surge_multiplier REAL DEFAULT 1.0, unit_cost REAL, unit_count INTEGER DEFAULT 1
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS epochs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      starts_at BIGINT NOT NULL, ends_at BIGINT, status TEXT DEFAULT 'OPEN'
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS epoch_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch_id INTEGER NOT NULL, role TEXT NOT NULL, wallet_or_node_id TEXT,
      amount_usdt REAL NOT NULL, status TEXT DEFAULT 'UNPAID', created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT NOT NULL, amount_usdt REAL NOT NULL,
      status TEXT DEFAULT 'PENDING', created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS payout_batches_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'PENDING',
      total_amount_usdt REAL NOT NULL, transaction_count INTEGER,
      created_at BIGINT NOT NULL, updated_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS payout_items_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL, withdrawal_id INTEGER, wallet TEXT NOT NULL,
      amount_usdt REAL NOT NULL, tx_hash TEXT, status TEXT DEFAULT 'PENDING',
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS pricing_rules (
      op_type TEXT PRIMARY KEY,
      base_price_usdt REAL NOT NULL, surge_enabled INTEGER DEFAULT 0,
      surge_threshold INTEGER DEFAULT 1000, surge_multiplier REAL DEFAULT 1.0,
      version INTEGER DEFAULT 1, updated_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS distribution_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch_id INTEGER NOT NULL, status TEXT DEFAULT 'PENDING',
      total_allocated_usdt REAL, node_pool_usdt REAL, platform_fee_usdt REAL,
      distribution_pool_usdt REAL, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS settlement_evm_txs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT, tx_hash TEXT UNIQUE, chain_id INTEGER,
      from_address TEXT, to_address TEXT, amount_usdt REAL, gas_fee_usdt REAL,
      status TEXT DEFAULT 'PENDING', created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS settlement_shadow_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT, reference_id TEXT, amount_usdt REAL,
      account_key TEXT, direction TEXT, status TEXT DEFAULT 'pending',
      created_at BIGINT NOT NULL
  )`);

  // ═══════════════════════════════════════════════════════════
  // Auth / Security
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS auth_nonces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL, nonce TEXT NOT NULL,
      expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS trusted_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT NOT NULL, device_public_id TEXT NOT NULL, label TEXT,
      user_agent TEXT, ip_hash TEXT, first_seen_at BIGINT, last_seen_at BIGINT,
      status TEXT DEFAULT 'active', UNIQUE(wallet, device_public_id)
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS reauth_tokens (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL, token_hash TEXT NOT NULL, scope TEXT,
      expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      severity TEXT, category TEXT, entity_type TEXT, entity_id TEXT,
      title TEXT NOT NULL, evidence_json TEXT, status TEXT DEFAULT 'open',
      created_at BIGINT NOT NULL, type TEXT, source_ip TEXT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS enforcement_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, decision TEXT NOT NULL,
      reason_codes_json TEXT, ttl_seconds INTEGER NOT NULL,
      created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, created_by TEXT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_wallet TEXT, action_type TEXT NOT NULL, metadata TEXT,
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS admin_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_wallet TEXT, action_type TEXT NOT NULL, target_type TEXT, target_id TEXT,
      before_json TEXT, after_json TEXT, ip_hash TEXT, created_at BIGINT NOT NULL,
      prev_hash TEXT, entry_hash TEXT
  )`);

  // ═══════════════════════════════════════════════════════════
  // Nodes / Network
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS node_uptime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_wallet TEXT NOT NULL, epoch_id INTEGER,
      uptime_seconds INTEGER DEFAULT 0, score INTEGER DEFAULT 0, created_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS node_reputation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT UNIQUE NOT NULL, composite_score REAL DEFAULT 50.0,
      tier TEXT DEFAULT 'BRONZE', reliability_score REAL, latency_score REAL,
      uptime_pct REAL, fraud_score REAL DEFAULT 0.0, last_updated BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS reputation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL, composite_score REAL, tier TEXT,
      recorded_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS node_diag_bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL, bundle_json TEXT, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS node_setup_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setup_id TEXT UNIQUE NOT NULL, owner_wallet TEXT NOT NULL,
      status TEXT DEFAULT 'pending', created_at BIGINT NOT NULL, expires_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS node_release_policy (
      channel TEXT PRIMARY KEY,
      min_version TEXT NOT NULL, build_hash TEXT,
      updated_at BIGINT, updated_by TEXT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS node_remediation_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL, issue_type TEXT, suggestion TEXT, severity TEXT,
      status TEXT DEFAULT 'open', created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS node_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_wallet TEXT NOT NULL, epoch_id INTEGER,
      amount_usdt REAL, created_at BIGINT NOT NULL
  )`);

  // ═══════════════════════════════════════════════════════════
  // Builder / API
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS builders (
      wallet TEXT PRIMARY KEY, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS builder_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      builder_wallet TEXT NOT NULL, name TEXT NOT NULL,
      status TEXT DEFAULT 'active', created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL, key_hash TEXT NOT NULL, key_prefix TEXT NOT NULL,
      name TEXT, status TEXT DEFAULT 'active',
      created_at BIGINT NOT NULL, revoked_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER, endpoint TEXT, method TEXT,
      status_code INTEGER, latency_ms INTEGER, cost_usdt REAL,
      created_at BIGINT NOT NULL
  )`);

  // ═══════════════════════════════════════════════════════════
  // Beta / Growth
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS beta_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invite_code TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'active',
      max_uses INTEGER DEFAULT 1, used_count INTEGER DEFAULT 0,
      expires_at BIGINT, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS beta_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT UNIQUE NOT NULL, invite_code TEXT,
      status TEXT DEFAULT 'active', first_seen_at BIGINT, last_seen_at BIGINT,
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS beta_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT, category TEXT, severity TEXT, message TEXT,
      page_url TEXT, trace_id TEXT, created_at BIGINT NOT NULL
  )`);

  // ═══════════════════════════════════════════════════════════
  // System / Ops
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS system_flags (
      key TEXT PRIMARY KEY, value TEXT, updated_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS config_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL, limit_value INTEGER, updated_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS error_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT, route TEXT, method TEXT, status_code INTEGER,
      message TEXT, stack_hash TEXT, stack_preview TEXT,
      trace_id TEXT, request_id TEXT, client_id TEXT,
      count INTEGER DEFAULT 1, first_seen_at BIGINT, last_seen_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS slow_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_hash TEXT UNIQUE, avg_ms REAL, p95_ms REAL, count INTEGER,
      last_seen_at BIGINT, sample_sql TEXT, source TEXT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS request_traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT, request_id TEXT, route TEXT, method TEXT,
      status_code INTEGER, duration_ms INTEGER, client_id TEXT,
      node_id TEXT, ip_hash TEXT, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS runtime_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      heap_used_mb REAL, rss_mb REAL, event_loop_lag_ms REAL,
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS self_test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_type TEXT, status TEXT, result_json TEXT,
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS incident_bundles (
      id TEXT PRIMARY KEY,
      kind TEXT, title TEXT, severity TEXT, status TEXT DEFAULT 'open',
      summary TEXT, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS ops_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT, recommendation TEXT, priority TEXT,
      action_type TEXT, created_at BIGINT NOT NULL
  )`);

  // ═══════════════════════════════════════════════════════════
  // Partners / Support
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS partner_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id TEXT UNIQUE NOT NULL, partner_name TEXT NOT NULL,
      wallet TEXT NOT NULL, api_key_hash TEXT, status TEXT DEFAULT 'active',
      created_at BIGINT NOT NULL, updated_at BIGINT,
      total_ops INTEGER DEFAULT 0, rate_limit_per_min INTEGER DEFAULT 60,
      revenue_share_percent REAL DEFAULT 10.0
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS partner_disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id TEXT NOT NULL, dispute_id TEXT UNIQUE, amount_usdt REAL,
      reason TEXT, status TEXT DEFAULT 'open', created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS partner_webhooks (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL, url TEXT NOT NULL, secret_hash TEXT,
      events_json TEXT, enabled INTEGER DEFAULT 1, created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id TEXT NOT NULL, payload_json TEXT, http_status INTEGER,
      response_json TEXT, retry_count INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS webhook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id TEXT NOT NULL, event_type TEXT, status TEXT,
      created_at BIGINT NOT NULL
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT, message TEXT, bundle_json TEXT,
      status TEXT DEFAULT 'open', created_at BIGINT NOT NULL
  )`);

  // ═══════════════════════════════════════════════════════════
  // Tenant / SLA
  // ═══════════════════════════════════════════════════════════
  ensure(`CREATE TABLE IF NOT EXISTS tenant_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id TEXT UNIQUE NOT NULL, ops_per_minute INTEGER,
      error_budget_percent REAL DEFAULT 99.9,
      created_at BIGINT NOT NULL, updated_at BIGINT
  )`);
  ensure(`CREATE TABLE IF NOT EXISTS tenant_circuit_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id TEXT UNIQUE NOT NULL, state TEXT DEFAULT 'closed',
      reason TEXT, trip_count INTEGER DEFAULT 0,
      last_trip_at BIGINT, created_at BIGINT NOT NULL
  )`);

  // Bootstrap rows
  ensure(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('security_freeze', '0')`);
  ensure(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('withdrawals_paused', '0')`);
  ensure(`INSERT OR IGNORE INTO system_flags (key, value) VALUES ('simulation_mode', '1')`);
  ensure(`INSERT OR IGNORE INTO system_flags (key, value) VALUES ('beta_gate', '0')`);

}
