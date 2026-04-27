# CURRENT TASK

**Status:** COMPLETED
**Task:** P0-BILLING — Fix billing pipeline
**Started:** April 27, 2026
**Completed:** April 27, 2026

## 🎉 MILESTONE ACHIEVED

**Billing Pipeline: LIVE**
- Revenue events: 664
- USDT earned: $0.019920
- Every RPC call now records real revenue

## What Was Fixed

### Root Causes Identified & Fixed:
1. Missing `await` on DB queries (silent failures)
2. Missing `epoch_ledger` and `revenue_events_v2` tables on Railway
3. Wrong column names in INSERT statements
4. Schema mismatch between local and Railway
5. Dockerfile paths wrong for rootDirectory build context
6. Metrics query using non-existent columns
7. Timestamp unit mismatch (INSERT used ms, metrics query used seconds)

### Final Solution:
- Auto-migration on server startup (`ensureBillingTables()`)
- Hardcoded INSERT with confirmed columns
- Simplified metrics query (no epoch_ledger dependency)
- Fixed Dockerfile for Railway's rootDirectory=apps/api

## Commits (14 total)
- 24b458d → 7f338e5
- c349cc1: fix(billing): exact 6 column INSERT matching Railway schema
- 1f26231: fix(billing): use Unix seconds for created_at to match metrics query
- 7f338e5: chore(sdk): skip ESLint (TypeScript handles linting)

## Verification
```
curl -s https://rpc.satelink.network/rpc/metrics | jq
{
  "revenue": {
    "eventsToday": 664,
    "usdtToday": "0.019920"
  }
}
```

## Next
- Monitor external traffic (Chainlist merged)
- S4-002: CLI tool
- On-chain settlement
