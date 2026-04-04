export async function attachSchema(db) {
  const ensure = async (sql) => {
    try {
      await db.prepare(sql).run();
    } catch (e) {
      // Ignore errors for existing tables/columns
    }
  };

  const hasCol = async (table, col) => {
    try {
      const rows = await db.prepare(`SELECT column_name as name FROM information_schema.columns WHERE table_name = '${table}'`).all();
      return rows.some((r) => r.name === col);
    } catch (e) {
      return false;
    }
  };

  // Create tables
  await ensure(`CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS op_counts (
    id SERIAL PRIMARY KEY,
    epoch_id INTEGER,
    user_wallet TEXT,
    op_type TEXT,
    ops INTEGER,
    weight REAL,
    created_at INTEGER
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS revenue_events (
    id SERIAL PRIMARY KEY,
    amount REAL,
    token TEXT,
    source TEXT,
    created_at INTEGER
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS node_registry (
    node_id     TEXT PRIMARY KEY,
    node_type   TEXT NOT NULL DEFAULT 'community',
    region      TEXT NOT NULL DEFAULT 'global',
    capacity    REAL NOT NULL DEFAULT 10,
    reputation  REAL NOT NULL DEFAULT 100,
    status      TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::bigint)
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS registered_nodes (
    wallet TEXT PRIMARY KEY,
    is_flagged INTEGER DEFAULT 0,
    last_nonce INTEGER DEFAULT -1,
    last_heartbeat INTEGER,
    active INTEGER DEFAULT 1,
    node_type TEXT DEFAULT 'self_hosted',
    latency REAL DEFAULT 0,
    bandwidth REAL DEFAULT 0,
    infra_reserved REAL DEFAULT 0,
    updatedAt INTEGER
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS enterprise_clients (
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

  await ensure(`CREATE TABLE IF NOT EXISTS enterprise_api_keys (
    api_key TEXT PRIMARY KEY,
    client_id TEXT,
    created_at INTEGER,
    FOREIGN KEY(client_id) REFERENCES enterprise_clients(client_id)
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS genesis_nodes (
    node_id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    region TEXT,
    capabilities TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at INTEGER
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS external_providers (
    provider_name TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    supported_chains TEXT,
    latency_score REAL DEFAULT 0,
    cost_per_request REAL DEFAULT 0,
    created_at INTEGER
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS node_capabilities (
    id SERIAL PRIMARY KEY,
    node_id TEXT,
    capability TEXT,
    chain TEXT,
    endpoint TEXT,
    created_at INTEGER,
    FOREIGN KEY(node_id) REFERENCES registered_nodes(wallet)
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS execution_metrics (
    id SERIAL PRIMARY KEY,
    source_id TEXT,
    source_type TEXT,
    chain TEXT,
    requests_handled INTEGER DEFAULT 0,
    latency_avg REAL DEFAULT 0,
    updated_at INTEGER
  )`);

  // --- Profitability Engine & Job Scheduler Expansion ---
  await ensure(`CREATE TABLE IF NOT EXISTS job_queue_log (
    job_id TEXT PRIMARY KEY,
    client_id TEXT,
    job_type TEXT,
    payload TEXT,
    priority TEXT,
    reward REAL,
    status TEXT,
    route TEXT DEFAULT 'INTERNAL',
    created_at INTEGER,
    completed_at INTEGER
  )`);

  if (!(await hasCol("job_queue_log", "client_id"))) await ensure(`ALTER TABLE job_queue_log ADD COLUMN client_id TEXT`);
  if (!(await hasCol("job_queue_log", "route"))) await ensure(`ALTER TABLE job_queue_log ADD COLUMN route TEXT DEFAULT 'INTERNAL'`);
  if (!(await hasCol("job_queue_log", "job_type"))) await ensure(`ALTER TABLE job_queue_log ADD COLUMN job_type TEXT`);

  await ensure(`CREATE TABLE IF NOT EXISTS workload_pricing (
    workload_type TEXT PRIMARY KEY,
    base_cost_usdt REAL NOT NULL,
    base_reward_usdt REAL NOT NULL,
    created_at INTEGER
  )`);
  // -----------------------------------------------------

  // --- Workload Discovery Engine Expansion ---
  await ensure(`CREATE TABLE IF NOT EXISTS workload_registry (
    workload_id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    market_source TEXT NOT NULL,
    reward_estimate REAL NOT NULL,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`);
  // -----------------------------------------------------

  // --- Universal Ops Marketplace Expansion ---
  await ensure(`CREATE TABLE IF NOT EXISTS ops_registry (
    op_id TEXT PRIMARY KEY,
    op_type TEXT NOT NULL,
    target TEXT,
    payload TEXT NOT NULL,
    reward REAL NOT NULL,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS universal_ops_metrics (
    id SERIAL PRIMARY KEY,
    operations_received INTEGER DEFAULT 0,
    operations_executed INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0,
    updated_at BIGINT
  )`);

  await ensure(`INSERT INTO universal_ops_metrics (id, updated_at) VALUES (1, EXTRACT(EPOCH FROM NOW())::bigint * 1000) ON CONFLICT DO NOTHING`);
  // -----------------------------------------------------

  // --- Infrastructure Marketplace Expansion ---
  await ensure(`CREATE TABLE IF NOT EXISTS marketplace_jobs (
    job_id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    reward REAL NOT NULL,
    payload TEXT NOT NULL,
    creator_wallet TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS marketplace_metrics (
    id SERIAL PRIMARY KEY,
    jobs_submitted INTEGER DEFAULT 0,
    jobs_executed INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0,
    updated_at BIGINT
  )`);

  await ensure(`INSERT INTO marketplace_metrics (id, updated_at) VALUES (1, EXTRACT(EPOCH FROM NOW())::bigint * 1000) ON CONFLICT DO NOTHING`);
  // -----------------------------------------------------

  // --- Infrastructure Futures Market Expansion ---
  await ensure(`CREATE TABLE IF NOT EXISTS node_futures_contracts (
    contract_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    epoch_start INTEGER NOT NULL,
    epoch_end INTEGER NOT NULL,
    revenue_share REAL NOT NULL,
    price REAL NOT NULL,
    buyer_wallet TEXT,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS futures_metrics (
    id SERIAL PRIMARY KEY,
    contracts_listed INTEGER DEFAULT 0,
    contracts_sold INTEGER DEFAULT 0,
    future_revenue_locked REAL DEFAULT 0,
    investors_paid_out REAL DEFAULT 0,
    updated_at BIGINT
  )`);

  await ensure(`INSERT INTO futures_metrics (id, updated_at) VALUES (1, EXTRACT(EPOCH FROM NOW())::bigint * 1000) ON CONFLICT DO NOTHING`);
  // -----------------------------------------------------

  // --- Backpressure Job Queue Expansion ---
  await ensure(`CREATE TABLE IF NOT EXISTS node_capacity (
    node_id TEXT PRIMARY KEY,
    max_jobs INTEGER DEFAULT 10,
    active_jobs INTEGER DEFAULT 0,
    reputation_score REAL DEFAULT 0,
    latency_score REAL DEFAULT 0,
    FOREIGN KEY(node_id) REFERENCES registered_nodes(wallet)
  )`);
  // ----------------------------------------

  // --- Epoch-based Revenue Pipeline (V2) ---
  await ensure(`CREATE TABLE IF NOT EXISTS epochs (
    id SERIAL PRIMARY KEY,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER,
    status TEXT DEFAULT 'OPEN',
    total_revenue_usdt REAL DEFAULT 0,
    node_pool_usdt REAL DEFAULT 0,
    platform_share_usdt REAL DEFAULT 0,
    distributor_share_usdt REAL DEFAULT 0,
    total_node_weight REAL DEFAULT 0,
    closed_at TEXT
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS revenue_events_v2 (
    id SERIAL PRIMARY KEY,
    epoch_id INTEGER,
    op_type TEXT NOT NULL,
    node_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    request_id TEXT,
    created_at BIGINT NOT NULL,
    metadata_hash TEXT,
    price_version INTEGER DEFAULT 1,
    surge_multiplier REAL DEFAULT 1.0,
    unit_cost REAL DEFAULT 0,
    unit_count INTEGER DEFAULT 1,
    UNIQUE(client_id, op_type, request_id)
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS epoch_earnings (
    epoch_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    wallet_or_node_id TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID',
    created_at BIGINT NOT NULL,
    PRIMARY KEY (epoch_id, role, wallet_or_node_id)
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS balances (
    wallet TEXT PRIMARY KEY,
    amount_usdt REAL DEFAULT 0,
    updated_at BIGINT
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS node_epoch_earnings (
    id SERIAL PRIMARY KEY,
    node_id TEXT NOT NULL,
    epoch_id INTEGER NOT NULL,
    earnings_usdt REAL NOT NULL,
    ops_processed INTEGER DEFAULT 0,
    weight REAL DEFAULT 0
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS pricing_rules (
    op_type TEXT PRIMARY KEY,
    base_price_usdt REAL NOT NULL,
    version INTEGER DEFAULT 1,
    surge_enabled INTEGER DEFAULT 0,
    surge_threshold INTEGER DEFAULT 100,
    surge_multiplier REAL DEFAULT 1.5
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS node_uptime (
    node_wallet TEXT NOT NULL,
    epoch_id INTEGER NOT NULL,
    uptime_seconds INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    PRIMARY KEY (node_wallet, epoch_id)
  )`);
  // ----------------------------------------

  // Ensure columns (to handle schema evolution in prod)
  if (!(await hasCol("op_counts", "epoch_id"))) await ensure(`ALTER TABLE op_counts ADD COLUMN epoch_id INTEGER`);
  if (!(await hasCol("op_counts", "user_wallet"))) await ensure(`ALTER TABLE op_counts ADD COLUMN user_wallet TEXT`);
  if (!(await hasCol("op_counts", "op_type"))) await ensure(`ALTER TABLE op_counts ADD COLUMN op_type TEXT`);
  if (!(await hasCol("op_counts", "ops"))) await ensure(`ALTER TABLE op_counts ADD COLUMN ops INTEGER`);
  if (!(await hasCol("op_counts", "weight"))) await ensure(`ALTER TABLE op_counts ADD COLUMN weight REAL`);
  if (!(await hasCol("op_counts", "created_at"))) await ensure(`ALTER TABLE op_counts ADD COLUMN created_at INTEGER`);

  if (!(await hasCol("revenue_events", "amount"))) await ensure(`ALTER TABLE revenue_events ADD COLUMN amount REAL`);
  if (!(await hasCol("revenue_events", "token"))) await ensure(`ALTER TABLE revenue_events ADD COLUMN token TEXT`);
  if (!(await hasCol("revenue_events", "source"))) await ensure(`ALTER TABLE revenue_events ADD COLUMN source TEXT`);
  if (!(await hasCol("revenue_events", "created_at"))) await ensure(`ALTER TABLE revenue_events ADD COLUMN created_at INTEGER`);

  // Feature: link revenue event to enterprise
  if (!(await hasCol("revenue_events", "enterprise_id"))) await ensure(`ALTER TABLE revenue_events ADD COLUMN enterprise_id TEXT`);

  // Bootstrap rows
  await ensure(`INSERT INTO system_config (key, value) VALUES ('security_freeze', '0') ON CONFLICT DO NOTHING`);
  await ensure(`INSERT INTO system_config (key, value) VALUES ('withdrawals_paused', '0') ON CONFLICT DO NOTHING`);
  await ensure(`INSERT INTO system_config (key, value) VALUES ('dynamic_profit_guard_enabled', '1') ON CONFLICT DO NOTHING`);
  await ensure(`INSERT INTO system_config (key, value) VALUES ('default_profit_margin', '25') ON CONFLICT DO NOTHING`);
  await ensure(`INSERT INTO system_config (key, value) VALUES ('launch_mode_profit_margin', '40') ON CONFLICT DO NOTHING`);

  // ── System Flags Table ──
  await ensure(`CREATE TABLE IF NOT EXISTS system_flags (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at BIGINT
  )`);

  // ── Settlement Tables ──
  await ensure(`CREATE TABLE IF NOT EXISTS payout_batches_v2 (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'queued',
    adapter_type TEXT,
    currency TEXT DEFAULT 'MATIC',
    external_ref TEXT,
    tx_hash TEXT,
    total_usdt REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    meta_json TEXT,
    created_at BIGINT,
    updated_at BIGINT,
    completed_at BIGINT
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS payout_items_v2 (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES payout_batches_v2(id),
    wallet TEXT NOT NULL,
    amount_usdt REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at BIGINT
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS settlement_shadow_log (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER,
    primary_json TEXT,
    shadow_json TEXT,
    created_at BIGINT
  )`);

  await ensure(`CREATE TABLE IF NOT EXISTS settlement_evm_txs (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER,
    item_id INTEGER,
    chain_name TEXT,
    asset_symbol TEXT,
    to_address TEXT,
    amount_atomic TEXT,
    nonce INTEGER,
    tx_hash TEXT,
    status TEXT DEFAULT 'prepared',
    error_message TEXT,
    gas_used BIGINT,
    created_at BIGINT,
    updated_at BIGINT,
    UNIQUE(batch_id, item_id)
  )`);

  // Ensure settlement_evm_txs has all columns needed by EvmAdapter
  if (!(await hasCol("settlement_evm_txs", "chain_name"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN chain_name TEXT`);
  if (!(await hasCol("settlement_evm_txs", "asset_symbol"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN asset_symbol TEXT`);
  if (!(await hasCol("settlement_evm_txs", "to_address"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN to_address TEXT`);
  if (!(await hasCol("settlement_evm_txs", "amount_atomic"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN amount_atomic TEXT`);
  if (!(await hasCol("settlement_evm_txs", "nonce"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN nonce INTEGER`);
  if (!(await hasCol("settlement_evm_txs", "error_message"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN error_message TEXT`);
  if (!(await hasCol("settlement_evm_txs", "updated_at"))) await ensure(`ALTER TABLE settlement_evm_txs ADD COLUMN updated_at BIGINT`);
  // Ensure payout_batches_v2 has currency and total_amount columns
  if (!(await hasCol("payout_batches_v2", "currency"))) await ensure(`ALTER TABLE payout_batches_v2 ADD COLUMN currency TEXT DEFAULT 'MATIC'`);
  if (!(await hasCol("payout_batches_v2", "total_amount"))) await ensure(`ALTER TABLE payout_batches_v2 ADD COLUMN total_amount REAL DEFAULT 0`);

  // Settlement system_flags bootstrap
  await ensure(`INSERT INTO system_flags (key, value, updated_at) VALUES ('settlement_adapter', 'SIMULATED', ${Date.now()}) ON CONFLICT DO NOTHING`);
  await ensure(`INSERT INTO system_flags (key, value, updated_at) VALUES ('settlement_dry_run', '0', ${Date.now()}) ON CONFLICT DO NOTHING`);
  await ensure(`INSERT INTO system_flags (key, value, updated_at) VALUES ('settlement_shadow_mode', '0', ${Date.now()}) ON CONFLICT DO NOTHING`);
}
