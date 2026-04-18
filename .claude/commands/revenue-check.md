# /revenue-check

Run the REVENUE capability from .claude/skills/satelink/SKILL.md

## Core Rules

```
SPLIT RULE: 50% Node Operators / 30% Platform / 20% Distribution Pool

SOURCE OF TRUTH: revenue_events_v2 table
  - Every billable operation creates a row
  - amount_usdt, partner_id, node_id, method, timestamp

SETTLEMENT CHAIN:
  revenue_events_v2 → epoch_ledger → settlement_batches → Polygon tx
```

## Steps

1. Check revenue_events_v2 count:
   ```
   psql "$DATABASE_URL" -c "SELECT COUNT(*), SUM(amount_usdt) FROM revenue_events_v2;"
   ```

2. Check latest epoch:
   ```
   psql "$DATABASE_URL" -c "SELECT * FROM epoch_ledger ORDER BY epoch_id DESC LIMIT 1;"
   ```

3. Verify billing middleware is recording:
   - Check apps/api/src/workloads/rpc_gateway/global_gateway_router.js
   - Ensure _recordRevenue() called for BOTH cache hits and misses

4. Check split calculation:
   - src/services/split_engine.js
   - Basis points must sum to 10000 (100%)

5. Report revenue stats and any anomalies.

## Anti-patterns (REJECT)
- Changing billing without verifying revenue_events count
- Hardcoding split percentages
- Skipping edge cache billing
- Modifying epoch_ledger directly
