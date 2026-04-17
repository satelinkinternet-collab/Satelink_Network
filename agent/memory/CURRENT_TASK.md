# CURRENT TASK

## Task
S0-007 — Fix billing middleware async bugs

## Status
PENDING (next task)

## Context
Phase P1 revenue infrastructure is complete. Phase P2 is BLOCKED on S0-007.
The billing middleware has zero await calls — revenue is not being recorded.
This is the #1 blocker for the revenue engine.

## Resume Point
1. Find billing middleware files:
   - grep -rn "db.query\|pool.query" src/middleware/billing*.js apps/api/src/security/middleware/billing*.js
2. Every single DB call must have await in front of it
3. After fix: run seed_first_workload.js and verify revenue_events has rows

## Definition of Done
- [ ] All db.query() calls in billing middleware have await
- [ ] All pool.query() calls in billing middleware have await
- [ ] Run 100 test RPC calls via seed_first_workload.js
- [ ] Verify: SELECT count(*) FROM revenue_events WHERE source='rpc_request' returns >0
- [ ] Commit with format: fix(S0-007): await all billing middleware DB calls

## Last Completed
P1-001 through P1-006 — Revenue infrastructure (April 17, 2026)
