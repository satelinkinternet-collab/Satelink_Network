# CURRENT TASK

**Task:** P7-002 — Fix billing gap on Railway production
**Status:** BLOCKED
**Updated:** 2026-04-19

## Problem

50 RPC calls hit https://satelink-api-production.up.railway.app/rpc/amoy successfully but AUTO-EPOCH logs show "No revenue, skipping aggregation" — revenue_events_v2 getting zero rows on Railway DB despite calls succeeding.

## Root Cause Investigation (on resume)

1. Check if `global_gateway_router._recordRevenue()` is executing on Railway
2. Check if `revenue_events_v2` table exists on Railway DB:
   ```bash
   railway run -- psql "$DATABASE_URL" -c "\dt revenue_events*"
   ```
3. Check if `rpc_method_pricing` table has rows on Railway DB
4. Add console.log inside `_recordRevenue()` to confirm it fires
5. Check if the `/rpc/amoy` route on Railway goes through `global_gateway_router` or bypasses it

## Key Files

- `apps/api/src/workloads/rpc_gateway/rpc_gateway.js` — RPC handler
- `apps/api/src/gateway/global/global_gateway_router.js` — billing logic
- `apps/api/src/core/schema.js` — table creation on boot

## Resume Command

```
/resume
```

## Next Action After Fix

1. Run 50 calls again against Railway
2. Verify AUTO-EPOCH shows revenue > 0
3. Confirm epoch closes with real data

## Related Commits

- `ac19bd5` fix(P7-001): Railway production start command
- `8e2914a` fix(P6-001): Add settlement_batches migration to schema.js
- `36d8c6e` fix(P6-001): RPC gateway ensures OPEN epoch exists before recording revenue
