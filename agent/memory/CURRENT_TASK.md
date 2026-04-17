# CURRENT TASK

## Task
(none — ready for next task)

## Status
COMPLETE

## Last Completed
S0-007 — Fix billing middleware async bugs (April 17, 2026)

Fixed 15+ missing await calls in 5 files:
- apps/api/src/gateway/routes/rpc.js (await + .then() anti-pattern)
- apps/api/src/settlement/job_escrow.js (2 missing awaits on revenue_events INSERT)
- apps/api/src/settlement/deposit_detector.js (2 missing awaits, made handleDeposit async)
- apps/api/src/gateway/routes/public_marketplace.js (5 missing awaits)
- apps/api/src/dashboard_api/nodes_overview.js (6 missing awaits)

Test added: test/billing_async.test.js

## Next Task Options
1. P2-002: Run seed_first_workload.js (Phase 2 is now unblocked)
2. S0-008: Fix remaining async/sync DB bugs
3. S0-005: Branch consolidation
