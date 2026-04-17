# CURRENT TASK

## Task
P2-002 — Run seed_first_workload.js to verify billing works end-to-end

## Status
BLOCKED — API server not running

## Checkpoint (April 17, 2026)

### What's Done
- S0-007: Billing middleware async fix — COMPLETE (15+ awaits added)
- P1-001 to P1-006: Revenue infrastructure — COMPLETE
- Node #1 registered: NODE-SATELINK-001 active in database
- RPC provider registered for Polygon Amoy (chain_id: 80002)

### Current State
- **Billing IS working** — revenue_events_v2 has 770 rows, $4.98 total
- API server not running at localhost:8080
- seed_first_workload.js ready but needs running server

### Resume Steps
1. Start API server:
   ```bash
   cd /Users/pradeepjakuraa/satelink-mvp
   npm run dev
   # or: node apps/api/server.js
   ```

2. Run seed workload (in separate terminal):
   ```bash
   DATABASE_URL="postgresql://satelink:satelinkpass@127.0.0.1:5432/satelink" \
   API_URL="http://localhost:8080" \
   node scripts/bootstrap/seed_first_workload.js
   ```

3. Verify 100 new rows appear:
   ```sql
   SELECT count(*), sum(amount_usdt) FROM revenue_events_v2 WHERE op_type = 'rpc_call';
   ```
   Expected: count increases by ~100, total increases by ~$0.03

### Definition of Done for P2-002
- [ ] API server running
- [ ] seed_first_workload.js completes with >50% success
- [ ] revenue_events_v2 count increases
- [ ] Commit with: `feat(P2-002): verify billing end-to-end with 100 RPC calls`

## Database Connection
```
DATABASE_URL=postgresql://satelink:satelinkpass@127.0.0.1:5432/satelink
```
