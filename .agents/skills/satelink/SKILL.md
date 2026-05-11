# Satelink Project Skill

Production-grade Codex skill for the Satelink DePIN Network.
Covers audit, resume, revenue, deploy, debug, and checkpoint operations.

---

## Trigger Phrases

| Capability | Trigger Phrases |
|------------|-----------------|
| AUDIT | "run audit", "security check", "check for issues", "pre-deploy check" |
| RESUME | "resume", "continue", "pick up where", "what was I working on" |
| REVENUE | "billing", "revenue", "settlement", "epoch", "50/30/20 split" |
| DEPLOY | "deploy", "push to production", "vercel deploy", "start server" |
| DEBUG | "not working", "crash", "error", "broken", "failing", "debug" |
| CHECKPOINT | "save progress", "checkpoint", "before I stop", "end of session" |

---

## 1. AUDIT Capability

**Purpose:** Verify codebase health before deployment or major changes.

### Workflow

```
1. READ CONTEXT FIRST (mandatory)
   - Read agent/memory/PROGRESS.md
   - Read agent/memory/CURRENT_TASK.md

2. CHECK ASYNC/AWAIT BUGS (P0 — silent data corruption)
   grep -rn "db\.query\|db\.run\|db\.get\|db\.all" --include="*.js" --include="*.mjs" | grep -v "await"
   
   FAIL if any match found — these cause silent revenue loss.

3. CHECK SQLITE REFERENCES (migration complete)
   grep -rn "sqlite\|better-sqlite\|\.db'" --include="*.js" --include="*.mjs" src/ apps/
   
   FAIL if found — Satelink uses PostgreSQL only.

4. CHECK HARDCODED SECRETS
   grep -rn "0x[a-fA-F0-9]{40}\|sk_live\|pk_live\|apikey.*=.*['\"]" --include="*.js" src/ apps/
   
   FAIL if real secrets found (not placeholders).

5. RUN SECURITY GATE SCRIPTS
   scripts/security/check-secrets.sh
   scripts/security/check-test-endpoints.sh
   scripts/security/check-sqlite.sh
   scripts/security/check-auth-middleware.sh
   scripts/security/check-hardcoded-keys.sh
   scripts/security/check-jwt-fallback.sh
   
   ALL must PASS. Any FAIL blocks deployment.

6. REPORT
   Print: PASS/FAIL per check, file:line for failures, overall status.
```

### Anti-patterns (REJECT these)

- Skipping PROGRESS.md read
- Ignoring async/await warnings
- Deploying with any FAIL status
- Using `--no-verify` to bypass checks

---

## 2. RESUME Capability

**Purpose:** Continue work exactly where previous session stopped.

### Workflow

```
1. READ CURRENT_TASK.md (mandatory)
   cat agent/memory/CURRENT_TASK.md
   
   If missing: "No active task. Read PROGRESS.md for next PENDING task."

2. PARSE RESUME STATE
   Extract from CURRENT_TASK.md:
   - Task ID (e.g., S0-007, P2-003)
   - Current file being edited
   - Function/line number if checkpointed
   - Last completed step

3. VERIFY STATE
   - Check the file still exists
   - Verify line numbers are valid (file may have changed)
   - Read surrounding context

4. CONTINUE FROM EXACT POINT
   Do NOT restart from scratch.
   Do NOT re-read files already summarized in CURRENT_TASK.md.
   
5. UPDATE CHECKPOINT
   After meaningful progress, update CURRENT_TASK.md with new position.
```

### Anti-patterns (REJECT these)

- Starting fresh when CURRENT_TASK.md exists
- Re-analyzing files already documented
- Ignoring checkpoint line numbers
- Clearing CURRENT_TASK.md without completing task

---

## 3. REVENUE Capability

**Purpose:** Understand and maintain the Satelink economic model.

### Core Rules

```
SPLIT RULE: 50% Node Operators / 30% Platform / 20% Distribution Pool

SOURCE OF TRUTH: revenue_events_v2 table
  - Every billable operation creates a row
  - amount_usdt, partner_id, node_id, method, timestamp

SETTLEMENT CHAIN:
  revenue_events_v2 → epoch_ledger → settlement_batches → Polygon tx
  
  1. revenue_events_v2: Raw events per request
  2. epoch_ledger: Aggregated by epoch (hourly)
  3. settlement_batches: Grouped for on-chain settlement
  4. Polygon Amoy tx: Final anchoring (EpochAnchor contract)
```

### Workflow After RPC Changes

```
1. VERIFY BILLING MIDDLEWARE
   Check apps/api/src/workloads/rpc_gateway/global_gateway_router.js
   Ensure _recordRevenue() is called for BOTH:
   - Cache hits (edge cache)
   - Cache misses (external RPC)

2. TEST REVENUE RECORDING
   Before: SELECT COUNT(*) FROM revenue_events_v2;
   Run: node scripts/bootstrap/seed_first_workload.js
   After: SELECT COUNT(*) FROM revenue_events_v2;
   
   Delta should equal call count.

3. VERIFY SPLIT CALCULATION
   Check src/services/split_engine.js
   Basis points must sum to 10000 (100%)
   
4. CHECK EPOCH CLOSURE
   SELECT * FROM epoch_ledger ORDER BY epoch_id DESC LIMIT 1;
   Verify revenue_usdt matches expected from events.
```

### Anti-patterns (REJECT these)

- Changing billing without verifying revenue_events count
- Hardcoding split percentages (must be governance-controlled)
- Skipping edge cache billing
- Modifying epoch_ledger directly (it's derived data)

---

## 4. DEPLOY Capability

**Purpose:** Safe deployment workflows for all Satelink components.

### Backend Deployment

```
1. PRE-FLIGHT
   - Run AUDIT capability (must PASS)
   - Verify .env has all required vars (JWT_SECRET, DATABASE_URL, etc.)

2. START SERVER
   source .env && node apps/api/server.js
   
   Wait for: "Satelink Backend Running"
   Check: curl http://localhost:8080/health

3. SMOKE TEST
   - /health returns {"status":"ok"}
   - /v1/workload/rpc/amoy returns real block number
   - Self-test passes (watch boot logs)
```

### Frontend Deployment (Vercel)

```
1. LOCAL BUILD FIRST
   cd apps/web && NODE_ENV=production npm run build
   
   Must complete without errors.

2. DEPLOY
   cd apps/web && npx vercel --prod
   
   Wait for "Deployment ready"

3. SMOKE TEST
   curl -X POST https://satelink-dashboard.vercel.app/gateway/rpc/amoy \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   
   Must return real block number.
```

### Contract Deployment

```
1. TEST FIRST
   forge test -vv
   
   All tests must PASS.

2. DEPLOY
   node scripts/deploy-ethers.mjs --network amoy
   
3. VERIFY
   Check Polygonscan for contract deployment tx.
   Update .env with new contract addresses.
```

### Anti-patterns (REJECT these)

- Deploying without local build test
- Skipping smoke tests
- Deploying with failing security gates
- Using `--force` flags

---

## 5. DEBUG Capability

**Purpose:** Diagnose common Satelink issues efficiently.

### Boot Crashes

```
SYMPTOM: Server fails to start, crashes on boot

CHECK FIRST: apps/api/app_factory.mjs
  - Service wiring order matters
  - Missing await on async initialization
  - Circular dependencies

CHECK SECOND: src/config/env.js
  - Missing required env vars cause hard fail
  - JWT_SECRET must be 64+ chars

CHECK THIRD: Database connection
  - Is PostgreSQL running?
  - Is DATABASE_URL correct?
  - Run: psql "$DATABASE_URL" -c "SELECT 1"
```

### Billing Gaps (Revenue Not Recording)

```
SYMPTOM: RPC calls succeed but revenue_events_v2 doesn't grow

CHECK FIRST: apps/api/src/workloads/rpc_gateway/global_gateway_router.js
  - Is _recordRevenue() being called?
  - Check for missing await statements
  - Edge cache path must also bill

CHECK SECOND: Billing middleware
  - src/middleware/billing.js
  - All DB calls must use await

CHECK THIRD: Partner/Node registration
  - SELECT * FROM partners WHERE status = 'active';
  - SELECT * FROM nodes WHERE status = 'active';
```

### Epoch Not Closing

```
SYMPTOM: epoch_ledger not updating, rewards not calculating

CHECK: src/scheduler/jobs/
  - EpochCloseJob.js — runs every hour
  - Is scheduler started? Check boot logs for "[AUTO-EPOCH] Scheduler started"

CHECK: Epoch calculation
  - src/services/epoch_service.js
  - Verify epoch boundaries (hourly by default)

MANUAL CLOSE:
  node -e "require('./src/scheduler/jobs/EpochCloseJob').run()"
```

### Vercel Build Failures

```
SYMPTOM: Vercel deploy fails during build

STEP 1: Reproduce locally
  cd apps/web && NODE_ENV=production npm run build

STEP 2: Common fixes
  - 'use client' missing on pages using hooks
  - React version conflicts (check npm ls react)
  - next/dynamic with ssr:false in Server Components

STEP 3: Check vercel.json
  - Build command correct?
  - Output directory correct?
  - Missing env var references?
```

### Anti-patterns (REJECT these)

- Adding console.log everywhere (use structured logging)
- Commenting out failing code instead of fixing
- Restarting without reading error messages
- Deleting lock files without understanding why

---

## 6. CHECKPOINT Capability

**Purpose:** Maintain session continuity and progress tracking.

### Before Risky Operations

```
WRITE CURRENT_TASK.md:
  # CURRENT TASK
  
  ## Task
  [TASK-ID] — [Description]
  
  ## Status
  IN_PROGRESS
  
  ## Current Position
  File: [exact file path]
  Function: [function name]
  Line: [approximate line number]
  
  ## Completed Steps
  - [x] Step 1
  - [x] Step 2
  - [ ] Step 3 (in progress)
  
  ## Notes
  [Any important context for resume]
```

### After Completing Tasks

```
1. UPDATE PROGRESS.md
   - Change task status to DONE
   - Add notes about what was done
   - Update completion counts

2. COMMIT
   git add [specific files]
   git commit -m "feat(TASK-ID): description
   
   Co-Authored-By: Codex Opus 4.5 <noreply@anthropic.com>"

3. CLEAR CURRENT_TASK.md
   Only after commit succeeds.
   Replace with: "No active task."
```

### Commit Format

```
feat(TASK-ID): short description  — new feature
fix(TASK-ID): what was broken     — bug fix
chore(TASK-ID): maintenance       — cleanup, deps
test(TASK-ID): test additions     — new tests
docs(TASK-ID): documentation      — docs only
```

### Anti-patterns (REJECT these)

- Ending session without updating PROGRESS.md
- Large commits without task IDs
- Clearing CURRENT_TASK.md before committing
- Using "misc" or "updates" as commit messages

---

## Key File Locations

### Memory & State
```
agent/memory/PROGRESS.md      — Master task tracker
agent/memory/CURRENT_TASK.md  — Active task checkpoint
.Codex/AGENTS.md             — Project brain (read every session)
```

### Backend (apps/api)
```
apps/api/server.js                    — Entry point
apps/api/app_factory.mjs              — Service wiring
apps/api/src/middleware/billing.js    — Revenue recording
apps/api/src/workloads/rpc_gateway/   — RPC gateway
apps/api/src/services/                — Business logic
apps/api/src/scheduler/jobs/          — Cron jobs
```

### Frontend (apps/web)
```
apps/web/src/app/                     — Next.js pages
apps/web/src/app/gateway/rpc/[chain]/ — Public RPC route
apps/web/vercel.json                  — Vercel config
apps/web/next.config.ts               — Next.js config
```

### Contracts
```
contracts/                            — Solidity source
contracts/test/                       — Foundry tests
scripts/deploy-ethers.mjs             — Deploy script
```

### Security
```
scripts/security/                     — 6 gate scripts
src/config/env.js                     — Env validation
src/middleware/auth.js                — JWT middleware
```

### Database
```
sql/                                  — Migration files
src/database/                         — DB connection
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start backend | `source .env && node apps/api/server.js` |
| Build frontend | `cd apps/web && NODE_ENV=production npm run build` |
| Deploy frontend | `npx vercel --prod` |
| Run tests | `npm test` |
| Contract tests | `forge test -vv` |
| Check revenue | `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM revenue_events_v2"` |
| Security audit | Run all 6 scripts in scripts/security/ |

---

## Session Start Checklist

1. Read `.Codex/AGENTS.md` (project brain)
2. Read `agent/memory/CURRENT_TASK.md` (active task?)
3. Read `agent/memory/PROGRESS.md` (overall status)
4. If resuming: continue from checkpoint
5. If new task: write CURRENT_TASK.md first
