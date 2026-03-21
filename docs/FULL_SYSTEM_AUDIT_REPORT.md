# Satelink DePIN Backend — Full System Audit Report

**Date:** 2026-03-21
**Branch:** `integration/all-features`
**Auditor:** Automated deep-code analysis (5 parallel agents)
**Scope:** Full backend at `apps/api/` — pipeline, security, database, observability, deployment

---

## Production Readiness Score: 28 / 100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| E2E Pipeline Integrity | 30/100 | 25% | 7.5 |
| Security | 25/100 | 25% | 6.25 |
| Database Safety | 25/100 | 20% | 5.0 |
| Observability | 50/100 | 15% | 7.5 |
| Deployment Readiness | 15/100 | 15% | 2.25 |
| **Total** | | | **28.5** |

---

## EXECUTIVE SUMMARY

The Satelink backend has a well-architected modular design with strong primitives (JWT auth, Merkle-proof claims, double-entry ledger). However, the post-merge codebase contains **critical issues that would result in financial loss in production**:

1. **Revenue silently lost** — 5 of 6 revenue insertion paths write `epoch_id = NULL`, making those events invisible to epoch distribution
2. **Unauthenticated financial endpoints** — `/debug/run-epoch` (epoch finalization) and `/api/withdraw` (withdrawal creation) have zero auth
3. **Double-withdrawal possible** — race conditions in `claim()` and non-atomic liquidity checks
4. **Settlement double-spend** — crash between on-chain tx and DB update causes re-execution
5. **Hardcoded private keys in docker-compose.yml** with `FEATURE_REAL_SETTLEMENT=true`

---

## 1. CRITICAL ISSUES (Must Fix Before Any Deploy)

### C-01: Revenue Events Lost — NULL epoch_id (5 of 6 write paths)
**Impact:** Revenue recorded but never distributed to node operators
**Files:** `job_escrow.js:73-77`, `billing.js:50-52`, `futures_escrow.js:42-44`, `job_dispatcher.js:206`, `job_escrow.js:125-129`
**Detail:** Only `operations_engine.js:executeOp()` calls `initEpoch()` to assign a real epoch_id. All other insertion paths (escrow, billing, futures, dispatcher) write `epoch_id = NULL`. The epoch aggregator queries `WHERE epoch_id = ?` — NULL events are permanently invisible.
**Fix:** All revenue insertion paths must call `initEpoch()` or accept epoch_id as a parameter.

### C-02: `/debug/run-epoch` — Unauthenticated Epoch Finalization
**Impact:** Anyone can finalize epochs, manipulate balances, drain treasury
**File:** `src/gateway/routes.js:210-256`
**Detail:** `GET /debug/run-epoch` is registered directly on `app` with zero middleware. It creates epochs, calculates 50/30/20 splits, writes `epoch_earnings`, updates `balances`. Accepts `epoch_id` as a query parameter.
**Fix:** Add `requireAdmin` middleware or remove entirely (use protected admin routes for epoch management).

### C-03: `/api/withdraw` — Unauthenticated Withdrawal Creation
**Impact:** Anyone can submit withdrawals to any wallet for any amount
**File:** `server.js:97`, `src/gateway/routes/withdrawal_api.js`
**Detail:** Mounted after `app.listen()` with no JWT. Accepts `{ wallet, amount_usdt }` from request body. Only validation: amount > 0.
**Fix:** Mount behind `requireJWT` + `requireRole(['node_operator'])`.

### C-04: Double-Withdrawal via Concurrent `claim()` Calls
**Impact:** Node operators can claim rewards twice
**Files:** `operations_engine.js:424-437`, `withdraw_service.js:104-134`
**Detail:** Two concurrent `claim()` calls can both read UNPAID rows, both mark them CLAIMED, both insert withdrawals. The liquidity check is also non-atomic — concurrent large withdrawals can both pass the gate.
**Fix:** Use `SELECT ... FOR UPDATE` in the claim transaction. Make liquidity check + INSERT atomic.

### C-05: Settlement Double-Spend on Crash
**Impact:** USDT sent twice for same withdrawal
**File:** `withdrawal_processor.js:77-99`
**Detail:** Sequence is: (1) `fuse.settle()` sends on-chain tx (2) DB update to COMPLETED. Crash between steps 1 and 2 leaves DB at PENDING. On restart, the processor retries, sending USDT again. No idempotency key links the tx hash to the withdrawal before submission.
**Fix:** Record a pending tx_hash in DB before submitting on-chain. Check for existing tx_hash before retry.

### C-06: Hardcoded Private Keys in docker-compose.yml
**Impact:** Funds at immediate risk if composed with real contract addresses
**File:** `docker-compose.yml:42,107`
**Detail:** Hardhat account #0 key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` hardcoded alongside `FEATURE_REAL_SETTLEMENT=true`. The `x-common-env` anchor with `${JWT_SECRET:?}` validation is defined but never applied.
**Fix:** Remove hardcoded keys. Apply `x-common-env` via `<<: *common-env` merge syntax in each service.

### C-07: `initEpoch()` TOCTOU Race — Duplicate Open Epochs
**Impact:** Revenue split across two concurrent epochs, corrupting aggregation
**File:** `operations_engine.js:393-400`
**Detail:** Check-then-insert without locking. Two concurrent requests can both see no OPEN epoch and both INSERT. The `epoch_slot` UNIQUE index (from migration 013) never fires because `initEpoch()` doesn't set `epoch_slot`.
**Fix:** Use `INSERT ... ON CONFLICT DO NOTHING RETURNING id` + re-select, or advisory lock.

### C-08: `epoch_aggregator.js` References Non-Existent Column
**Impact:** `closeEpoch()` throws on every invocation — node rewards never distributed via this path
**File:** `epoch_aggregator.js:51-56`
**Detail:** Queries `WHERE node_id IS NOT NULL` on `op_counts` table, but the column is `user_wallet`. PostgreSQL throws column-not-found.
**Fix:** Change `node_id` to `user_wallet` in the query.

---

## 2. HIGH PRIORITY ISSUES

### H-01: Dual Consumer Risk — Jobs Double-Executed
**Files:** `job_consumer.js`, `job_dispatcher.js`, `workerProcessor.js`
**Detail:** Three worker implementations can simultaneously consume from the same Redis stream, leading to double execution and double revenue recording.

### H-02: `JobConsumer` Calls Non-Existent Method
**File:** `job_consumer.js:72`
**Detail:** Calls `this.opsEngine.execute()` but `OperationsEngine` only exposes `executeOp()`. Revenue recording fails with TypeError when opsEngine is injected.

### H-03: Withdrawal tx_hash Accepted Without On-Chain Verification
**File:** `src/gateway/routes/api_phase3.js`
**Detail:** `POST /node/me/withdraw` records whatever `txHash` the client submits without chain verification. Fake or replayed hashes accepted silently.

### H-04: On-Chain Claim vs DB Claim — Two Disconnected Systems
**Detail:** `opsEngine.claim()` marks `epoch_earnings` as CLAIMED. `api_phase3.js` claim uses `node_epoch_earnings` via `RevenueOracle`. No synchronization between tables — double-claim possible.

### H-05: Balance Query Reads Wrong Table
**File:** `operations_engine.js:getBalance()`
**Detail:** Reads from `epoch_earnings`. Primary earnings path (EpochProcessor) writes to `node_epoch_earnings`. Node operators always see 0 balance.

### H-06: `admin_forensics.js` — No Auth Middleware
**File:** `src/gateway/routes/admin_forensics.js`
**Detail:** Endpoints include `POST /snapshot/run`, `POST /integrity/run`, `POST /disputes`, `GET /replay`. Zero authentication.

### H-07: `auth_v2.js` verifyJWT — No Algorithm/Issuer Enforcement
**File:** `src/gateway/routes/auth_v2.js:7-33`
**Detail:** Bare `jwt.verify(token, secret)` without options. Used by `admin_system.js` and `admin_growth.js`. Vulnerable to algorithm confusion attacks.

### H-08: Node Registration (`/v1/node/register`) Unauthenticated
**File:** `src/gateway/routes/node_network.js:35`
**Detail:** Anyone can register arbitrary nodes with any wallet, which then participate in epoch earnings distribution.

### H-09: `PgDatabase.transaction()` Not Re-Entrant
**File:** `pg_adapter.js:120-139`
**Detail:** Nested `db.transaction()` calls corrupt the outer transaction's client binding. All subsequent queries in the outer fn execute against the pool, outside the transaction.

### H-10: No SIGTERM Handler — Active Transactions Interrupted
**File:** `server.js`
**Detail:** Container stop sends SIGTERM → Node.js exits without draining HTTP requests, closing DB pool, or flushing logs. Active withdrawals and epoch jobs interrupted mid-flight.

### H-11: JWT_SECRET Hardcoded Fallback in Non-Production
**File:** `validateEnv.js:13`
**Detail:** Known-public `dev_secret__0123456789...` injected when `NODE_ENV !== 'production'`. Staging environments run with forgeable tokens.

### H-12: `SettlementEngine` Never Started
**File:** `settlement_engine.js`
**Detail:** Class is defined but never instantiated in any boot path. Payout batches in `payout_batches_v2` accumulate forever without processing.

### H-13: No Indexes on `revenue_events_v2`
**File:** `docker/init/init.sql`
**Detail:** No index on `node_id`, `epoch_id`, or `created_at`. This is the hottest table in the system, queried in 40+ locations. Every dashboard/aggregation query is a sequential scan.

### H-14: No Indexes on `epoch_earnings(wallet_or_node_id, status)`
**Detail:** `getBalance()` queries `WHERE wallet_or_node_id = ? AND status = 'UNPAID'` — full table scan on every claim attempt.

### H-15: Balance Update Outside Epoch Transaction
**File:** `epoch_scheduler.js:121-128`
**Detail:** `epoch_earnings` INSERT is inside `db.transaction()`. Balance UPDATE loop runs outside. Crash between them creates permanently stale balances.

### H-16: Three Divergent Schema Sources
**Files:** `docker/postgres/init/001_init.sql`, `docker/init/init.sql`, `src/core/schema.js`
**Detail:** Tables defined differently across files. `registered_nodes` missing columns in Docker init. Schema.js patches at runtime with silent failure swallowing.

### H-17: `BatchCreator._createBatch()` Has No Transaction
**File:** `batch_creator.js:62-83`
**Detail:** Inserts batch header, loops inserting items, updates withdrawal status — all separate queries. Partial batch on crash.

### H-18: Hardcoded $100 Claim Endpoint
**File:** `user_settlement.js:22`
**Detail:** `/claim` route returns hardcoded `claimAmount = 100.0` regardless of actual balance. Development stub still active.

### H-19: Uptime Gaming — 15x Multiplier
**File:** `src/nodes/heartbeat.js:84`
**Detail:** `uptimeDelta` cap is 900s (15 min), but epochs can be 60s. A node sending one heartbeat claims 899s against a 60s epoch — 14.98x legitimate credit.

### H-20: `node_epoch_earnings` Has No UNIQUE Constraint
**File:** `docker/init/init.sql:139-146`
**Detail:** No `UNIQUE(node_id, epoch_id)`. The debug endpoint and any retry path can create duplicate earnings rows.

---

## 3. MEDIUM PRIORITY ISSUES

| ID | Issue | File |
|----|-------|------|
| M-01 | `revenue_events_v2` UNIQUE nullified when `request_id` is NULL | `init.sql:120` |
| M-02 | In-memory rate limiting — resets on restart, per-process only | `queue_backpressure.js`, `operations_engine.js` |
| M-03 | `epochs.closed_at` typed TEXT, should be BIGINT (lexicographic sort) | `init.sql:102` |
| M-04 | `revenue_events.enterprise_id` missing in `001_init.sql` | `001_init.sql:80` |
| M-05 | Refresh token JTI revocation not implemented (TODO comment) | `auth_controller.js:158` |
| M-06 | `/auth/verify` endpoint has no rate limiter | `auth_controller.js:60` |
| M-07 | CORS wildcard when `CORS_ORIGINS` is empty/unset | `security/middleware.js` |
| M-08 | In-memory abuse firewall ban list — resets on restart | `abuse_firewall.js:24` |
| M-09 | `/ledger/claim,treasury,epochs,claims/monitor` unauthenticated | `ledger.js` |
| M-10 | `exec()` in PgDatabase bypasses `_txClient` | `pg_adapter.js:145` |
| M-11 | `admin_control_api.js` read routes have no auth (only writes check role) | `admin_control_api.js` |
| M-12 | `revenue/summary` endpoint does full table scan (no LIMIT) | `admin_api_v2.js:293` |
| M-13 | `DepositDetector` can double-credit on provider reconnect | `deposit_detector.js:44-48` |
| M-14 | `JOB_SIGNING_SECRET` generates random key on every restart | `job_dispatcher.js:5` |
| M-15 | `JWT_REFRESH_SECRET` not validated in `validateEnv.js` | `validateEnv.js` |
| M-16 | Dockerfile runs as root (no USER directive) | `apps/api/Dockerfile` |
| M-17 | Pool max:20 hardcoded — multi-worker deploys exhaust PG connections | `pg_adapter.js:44` |
| M-18 | `EvmAdapter.getBatchStatus` calls `db.query()` (PG API on SQLite) | `EvmAdapter.js:302` |
| M-19 | `unified_dashboard_api.js` admin sub-router delegates auth to child router | `unified_dashboard_api.js:12` |
| M-20 | Migration failures silently swallowed (no logging, no version table) | `schema.js:40-93` |

---

## 4. LOW PRIORITY ISSUES

| ID | Issue | File |
|----|-------|------|
| L-01 | `unhandledRejection` logs but doesn't trigger graceful shutdown | `server.js:22` |
| L-02 | Dead code in `executeOp()` — `recordRevenue` built but never called with ledger | `operations_engine.js:243-251` |
| L-03 | `/__test/auth` mounted unconditionally (guard is inside router) | `routes.js:148` |
| L-04 | `/demo/*` endpoints unprotected | `routes.js:83-86` |
| L-05 | Prometheus `/metrics` publicly accessible | `routes.js:93` |
| L-06 | Private keys logged in dev smoke scripts | `smoke_phase_j.sh:11` |
| L-07 | String interpolation for pagination in `ui.js` (safe via parseInt) | `ui.js:202,211,220` |
| L-08 | `heartbeat_security_log` / `auth_failures` — no indexes for forensics | |
| L-09 | Event loop lag hardcoded to 0 in RuntimeMonitor | `runtime_monitor.js:42` |
| L-10 | Node CPU always returns 0; bandwidth is op-count proxy | `node_api_v2.js:160` |
| L-11 | NodeLeaderboard not wired to any HTTP route | `node_leaderboard.js` |
| L-12 | `GRAFANA_ADMIN_PASSWORD` defaults to literal 'satelink' | `docker-compose.yml` |

---

## 5. OBSERVABILITY GAPS

### What Exists (Good)
- Revenue tracking: `GET /admin-api/revenue-events`, `/admin-api/revenue/summary`, `/admin/revenue/stats`
- Epoch state: `GET /admin-api/epochs/current`, `/admin-api/rewards/summary`
- Public status: `GET /status` — active nodes, uptime, operations count
- Admin withdrawals: `GET /admin-api/withdrawals?status=PENDING/COMPLETED/FAILED`
- DB health: `GET /admin/system/database` — pool stats
- Runtime: `GET /admin/system/runtime` — heap, RSS
- Alerts: Telegram integration via `AlertService`

### What's Missing (Required for Dashboard)
| Metric | Status | Notes |
|--------|--------|-------|
| BullMQ queue depth via HTTP | MISSING | `getQueueMetrics()` exists but no endpoint |
| Custom Prometheus counters | MISSING | Only default Node.js metrics exposed |
| Job success/failure rate (aggregate) | MISSING | Only per-partner via SLA engine |
| Node latency (real P95) | MISSING | Only request_traces via tracing middleware |
| Node real bandwidth | MISSING | `bw = ops * 10` proxy |
| Withdrawal retry_count / stuck alerts | MISSING | Column exists, not exposed |
| Network topology / geo distribution | MISSING | No per-region data |
| Real-time event feed (WebSocket/SSE) | MISSING | Telegram only push channel |

---

## 6. UI DATA REQUIREMENTS

### Dashboard Pages and Their Data Sources

| Dashboard Section | Endpoint | Data Available | Missing |
|-------------------|----------|----------------|---------|
| Network Health | `GET /status` | active_nodes, uptime_pct, total_ops_24h | geo distribution, latency map |
| Jobs | `GET /admin-api/revenue/summary` | today/total/byType | queue depth, success/fail ratio |
| Revenue Per Node | `GET /node/earnings` (auth'd) | per-epoch earnings, claimable | admin cross-node comparison |
| Epoch Earnings | `GET /admin-api/rewards/summary` | last 10 epochs, distributed totals | per-node breakdown for admin |
| Pending Withdrawals | `GET /admin-api/withdrawals` | status, amount, wallet | retry_count, time-in-queue |
| System Alerts | `GET /admin-api/security/alerts` | FAILED_AUTH, ROLE_CHANGE, etc. | real-time feed, severity levels |
| System Health | `GET /admin/system/runtime` | heap, RSS, pool stats | event loop lag, CPU, queue depth |

---

## 7. RECOMMENDED FIX ORDER

### Phase 1: Security Lockdown (Day 1-2)
1. Add auth to `/debug/run-epoch`, `/api/withdraw`, `admin_forensics.js`
2. Remove or gate `/__test/auth`, `/demo/*` endpoints
3. Remove JWT_SECRET fallback from validateEnv.js
4. Replace `auth_v2.js` verifyJWT with canonical middleware
5. Add auth to `/v1/node/register` and `/v1/node/heartbeat`
6. Remove hardcoded private keys from docker-compose.yml

### Phase 2: Financial Safety (Day 3-5)
7. Fix all revenue insertion paths to include `epoch_id`
8. Add `SELECT ... FOR UPDATE` to `claim()` transaction
9. Make liquidity check + withdrawal INSERT atomic
10. Add pre-submission tx_hash recording to WithdrawalProcessor
11. Fix `epoch_aggregator.js` column reference (`node_id` → `user_wallet`)
12. Add `UNIQUE(node_id, epoch_id)` to `node_epoch_earnings`
13. Remove hardcoded $100 claim stub
14. Fix `initEpoch()` with `ON CONFLICT DO NOTHING RETURNING`

### Phase 3: Database Hardening (Day 6-7)
15. Add indexes: `revenue_events_v2(node_id)`, `(epoch_id)`, `(created_at)`
16. Add index: `epoch_earnings(wallet_or_node_id, status)`
17. Unify schema init files (single source of truth)
18. Add migration version table
19. Fix `PgDatabase.transaction()` re-entrancy
20. Wrap `BatchCreator._createBatch()` in transaction

### Phase 4: Pipeline Fixes (Day 8-10)
21. Consolidate to single worker implementation
22. Fix `JobConsumer` method name (`execute` → `executeOp`)
23. Start `SettlementEngine` in worker boot path
24. Move balance update inside epoch transaction
25. Fix heartbeat uptime cap to match epoch duration
26. Add SIGTERM graceful shutdown handler

### Phase 5: Observability (Day 11-12)
27. Expose BullMQ metrics via HTTP endpoint
28. Register custom Prometheus counters for revenue, epochs, withdrawals
29. Wire NodeLeaderboard to an admin route
30. Add withdrawal stuck-alert monitoring

---

## CONFIRMATION: NO CODE WAS MODIFIED

This audit is read-only. All findings are analytical. No files were changed.

---

*Generated by automated deep-code analysis across 5 parallel audit agents.*
*Total analysis: ~475K tokens processed, 293 tool invocations, 70+ source files examined.*
