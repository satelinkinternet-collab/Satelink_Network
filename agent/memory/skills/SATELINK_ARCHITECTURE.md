# SATELINK TECHNICAL ARCHITECTURE
# Reference for all engineering agents before any code task.

---

## REQUEST FLOW (how money moves)

1. External RPC request arrives at rpc.satelink.network
2. FreeTierGate checks IP — is it under 500/day limit?
   YES → serve free, increment counter
   NO → CreditGate checks if wallet has USDT deposit
       YES → deduct credits, serve request, record RevenueEvent
       NO → return 402 Payment Required with upgrade URL
3. RevenueEvent written to revenue_events_v2 table in PostgreSQL
4. EpochScheduler closes epoch (time-based)
5. EpochFinalizer calculates 50/30/20 split
6. SettlementAnchor submits Merkle root to Polygon mainnet
7. Claims route enables operator withdrawals (48-day window)

---

## DATABASE SCHEMA (key tables)

nodes — registered node operators
  id, wallet_address, region, endpoint, status, reputation_score, created_at

revenue_events_v2 — every billable operation
  id, node_id, op_type, amount_usdt, epoch_id, timestamp

epochs — epoch lifecycle
  id, start_time, end_time, status, total_revenue, ledger_hash

claims — operator reward claims
  id, node_id, epoch_id, amount_usdt, status, claimed_at, expires_at

free_tier_usage — IP-based free call tracking
  ip_address, call_count, date, reset_at

credit_balances — USDT deposit balances
  wallet_address, balance_usdt, last_deposit_at

Migrations: 25+ migrations in apps/api/src/db/migrations/
Latest: 025_rpc_method_pricing.sql

---

## KEY API ENDPOINTS

Health: GET /health → { status, uptime, epoch }
Status: GET /api/status → { epoch, nodeCount, revenue }
Free tier: GET /system/free-tier → { totalIPs, callsByIP }

Node registration: POST /api/nodes/register
Node heartbeat: POST /api/nodes/heartbeat
Node earnings: GET /api/nodes/:id/earnings
Node claim: POST /api/nodes/:id/claim

Auth login: POST /api/auth/node-token [LIVE as of commit 9daffb9]
Auth register: POST /api/auth/register

Admin nodes: GET /admin/nodes
Admin revenue: GET /admin/revenue
Admin epochs: GET /admin/epochs

---

## ECONOMICS ENGINE

Epoch split calculation:
  operator_pool = epoch_revenue * 0.50
  treasury_pool = epoch_revenue * 0.30
  infra_pool    = epoch_revenue * 0.20

Node share:
  node_share = (node_ops / total_ops) * operator_pool * nets_multiplier

NETS score (Node Economic Trust Score):
  8 dimensions: uptime, latency, reliability, revenue, fraud, consistency, geo, age
  Score 0-100. Higher score = larger nets_multiplier.
  Scores decay 5%/week for inactive nodes.

Claim window: 48 days from epoch close.
Expired claims → return to treasury.

---

## CONTRACTS ON POLYGON MAINNET

RevenueVault: 0x80AFEaC3B77CbeC1f7B9f24a50319DC72785DdA3
Network: Polygon PoS (chainId: 137)
RPC for contract calls: https://rpc.satelink.network (self-referential)

Settlement anchor: SettlementAnchorJob runs after each epoch close.
Writes Merkle root of ledger hash to RevenueVault on-chain.
This creates an immutable audit trail of every epoch's revenue distribution.

---

## KNOWN ARCHITECTURE DECISIONS

Redis eliminated: replaced with in-memory Maps (commit 2889bdd)
  Reason: simplicity, Railway cost reduction
  Trade-off: no persistence across server restarts for in-flight data

ethers v6: upgraded from v5 (commit 8187bba)
  Breaking change: providers and signers API different from v5

Fuse Network → Polygon: full migration complete
  All chainId references updated to 137
  All RPC URLs point to Polygon

SQLite: completely eliminated, PostgreSQL only

Auth router: createUnifiedAuthRouter factory exported from node_auth_route.mjs
  Mounted at /api/auth in app_factory.mjs (commit 9daffb9)
  All auth requests go through /api/auth/* prefix
