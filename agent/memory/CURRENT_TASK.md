# CURRENT TASK

**Task:** P7-002 — Fix billing gap on Railway production
**Status:** DONE
**Updated:** 2026-04-19

## Problem

50 RPC calls hit https://satelink-api-production.up.railway.app/rpc/amoy successfully but AUTO-EPOCH logs show "No revenue, skipping aggregation" — revenue_events_v2 getting zero rows on Railway DB despite calls succeeding.

## Root Cause (IDENTIFIED)

The `/rpc/:chain` route (createRpcRouter) did NOT have 'amoy' in its adapters list. Calls to `/rpc/amoy` would get 400 "Unsupported chain", and billing only records when `statusCode === 200`.

Two RPC routes exist:
- `/v1/workload/rpc/:chain` → createRpcGateway (has amoy support) ✅
- `/rpc/:chain` → createRpcRouter (was missing amoy) ❌

## Fix Applied (2026-04-19)

1. Created `apps/api/src/providers/adapters/amoy.js` — AmoyAdapter
2. Added amoy to adapters in `apps/api/src/gateway/routes/rpc.js`
3. Added amoy to rpcProvidersMap in `apps/api/src/core/config/rpc_providers.js`
4. Updated `ProviderFallbackAdapter` to do real RPC calls (not mocks) for configured endpoints
5. Added better logging to `_recordRevenue()` in global_gateway_router.js

## Verification (2026-04-19)

1. ✅ Deployed to Railway (commits 8d9190e, 868329f, 0d8ffea)
2. ✅ 50 calls to `/rpc/amoy` completed successfully
3. ✅ Revenue recorded to epoch 16 (logs show "Gateway Revenue recorded")
4. ✅ Public tier IP rate limiting working ("1/100 today")
5. ✅ No API key required for public RPC calls

## Result

P7-002 COMPLETE — billing pipeline working on Railway production

## Key Files Modified

- `apps/api/src/providers/adapters/amoy.js` (NEW)
- `apps/api/src/gateway/routes/rpc.js`
- `apps/api/src/core/config/rpc_providers.js`
- `apps/api/src/execution/bootstrap/provider_fallback_adapter.js`
- `apps/api/src/gateway/global/global_gateway_router.js`

## Related Commits

- `ac19bd5` fix(P7-001): Railway production start command
- `8e2914a` fix(P6-001): Add settlement_batches migration to schema.js
- `36d8c6e` fix(P6-001): RPC gateway ensures OPEN epoch exists before recording revenue
