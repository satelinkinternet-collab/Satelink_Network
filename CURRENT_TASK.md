# Satelink — Current Task State
Date: 2026-04-16

## What we completed today
- Repo cleanup: 2.1 GB → 1.4 GB, 963 files changed (commit 34c6167, pushed develop)
  - Deleted apps/dashboard (549MB orphan .next), apps/dashboard_archived, .venv/.venv-1,
    out/, broadcast/, root dashboard/, agents/, ui_garage/, infrastructure/, skills/,
    packages/, services/
  - Removed root ad-hoc scripts, stale seeds, audit prompts, duplicate README_DEV
  - git-removed server.js.broken_postgres, vendored apps/api/src/utils/lib/openzeppelin-contracts
  - Dropped dev:all/dev:full/dev:backend scripts from apps/web/package.json
  - Kept src/ (imported by apps/api tests), test/, lib/ (Foundry), utils/logger+validateEnv
- Health check: server boots clean, 18/21 live tests pass, all 6 critical imports resolve
- Polygon PoS migration (commit 3e909e7, pushed develop)
  - Added PolygonUsdtAdapter (chain 137, MATIC gas, USDT 0xc2132D05D31c914a87C6611C10748AEb04B58e8F)
  - Deprecated FuseUsdtAdapter with JSDoc warning (kept for legacy migration)
  - adapter_registry now reads SETTLEMENT_ADAPTER env var (polygon|fuse|evm|shadow|simulated)
  - app_factory registers Polygon/Fuse adapters conditionally on env
  - .env.example: POLYGON_* vars primary, FUSE_* demoted to deprecated block
- Self-test unblock (commit 6d1d89e, pushed develop)
  - Added idempotent "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS retry_count" to
    inline migrations in apps/api/src/core/schema.js
  - Execution/Revenue + Epoch Finalization stages now PASS (were cascaded FAIL)

## What is next (tomorrow morning)
1. Fix Claim Flow self-test — epoch_id type mismatch
   - apps/api/src/utils/self_test.js:42 inserts UUID into epoch_earnings.epoch_id (INTEGER)
   - Decide: change column type to TEXT in schema migrations, or generate an int in self-test
2. Fix 3 failing withdrawal_api.test.js cases (pre-existing)
   - Tests expect 400 from validation; route returns 401 from auth guard (added in P0 commit 541f6f5)
   - Either use authenticated client in tests, or assert 401
3. Fix 7 legacy test/*.test.js files that import better-sqlite3 (missing dep)
   - Either add better-sqlite3 to root package.json or delete/port the suite
4. Latent: create withdrawals_v2 table
   - withdrawService.js:44,90,105 queries it, but init.sql never creates it
5. Migrate remaining 24 Fuse call sites (non-settlement)
   - revenue_oracle.js, treasury_monitor.js, providers/adapters/fuse.js, integrations/fuseio.js, etc.
   - Only settlement adapter was swapped today; business-logic call sites still target Fuse
6. Triage 123 Dependabot alerts on default branch (12 critical, 41 high)

## Branch state
- develop = source of truth (commit 6d1d89e)
- main = protected (needs PR to update)
- Local working tree: clean, in sync with origin/develop

## Key file pointers (stable after cleanup)
- Backend entry: apps/api/server.js → app_factory.mjs
- Settlement adapters: apps/api/src/settlement/adapters/{Polygon,Fuse,Evm,Shadow,NodeOps}*.js
- Adapter registry: apps/api/src/settlement/adapter_registry.js (env-driven)
- DB bootstrap: docker/init/init.sql (fresh DBs)
- DB ad-hoc migrations: apps/api/src/core/schema.js (inline array, runs every boot)
- Frontend: apps/web (only live Next.js app)

## How to resume tomorrow
Open VS Code → open terminal → type: claude
Then say: "Read CURRENT_TASK.md and start on item 1 (Claim Flow epoch_id type fix)"
