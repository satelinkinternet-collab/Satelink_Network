# /debug

Run the DEBUG capability from .claude/skills/satelink/SKILL.md

Usage: /debug [symptom]
  - /debug boot      → Boot/crash issues
  - /debug billing   → Revenue not recording
  - /debug epoch     → Epoch not closing
  - /debug vercel    → Vercel build failures
  - /debug (no args) → General diagnosis

## Boot Crashes

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
  psql "$DATABASE_URL" -c "SELECT 1"
```

## Billing Gaps

```
SYMPTOM: RPC calls succeed but revenue_events_v2 doesn't grow

CHECK FIRST: apps/api/src/workloads/rpc_gateway/global_gateway_router.js
  - Is _recordRevenue() being called?
  - All DB calls must use await
  - Edge cache path must also bill

CHECK SECOND: Partner/Node registration
  SELECT * FROM partners WHERE status = 'active';
  SELECT * FROM nodes WHERE status = 'active';
```

## Epoch Not Closing

```
SYMPTOM: epoch_ledger not updating

CHECK: src/scheduler/jobs/
  - EpochCloseJob.js — runs every hour
  - Boot logs: "[AUTO-EPOCH] Scheduler started"

MANUAL CLOSE:
  node -e "require('./src/scheduler/jobs/EpochCloseJob').run()"
```

## Vercel Build Failures

```
STEP 1: Reproduce locally
  cd apps/web && NODE_ENV=production npm run build

STEP 2: Common fixes
  - 'use client' missing on pages using hooks
  - React version conflicts (npm ls react)
  - next/dynamic with ssr:false in Server Components

STEP 3: Check vercel.json config
```

## Anti-patterns (REJECT)
- Adding console.log everywhere
- Commenting out failing code
- Restarting without reading error messages
- Deleting lock files without understanding why
