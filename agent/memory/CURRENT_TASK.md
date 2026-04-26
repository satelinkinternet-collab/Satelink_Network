# CURRENT TASK

**Status:** COMPLETED
**Task:** S2-003 Reputation Scoring System
**Started:** April 26, 2026
**Completed:** April 26, 2026

## Summary
Implemented complete reputation scoring system for DePIN nodes.

## What Was Built
- `apps/api/src/services/node_registry/reputation_engine.js` (new file)
- GET /api/nodes/:nodeId/reputation endpoint
- POST /api/nodes/:nodeId/reputation/update (admin)

## Scoring System
- Score: 0-1000 points
- Tiers: bronze(0-199), silver(200-399), gold(400-699), platinum(700-1000)
- Per epoch: +10/heartbeat, +5/rpc call, -20/missed, -50/downtime, -100/SLA violation
- Tier benefits: daily limits (1k-unlimited), earnings multiplier (0.9-1.1)

## Verification
```bash
curl https://rpc.satelink.network/api/nodes/NODE-ap-south-1-a09becbb/reputation
→ {"ok":true,"reputation":{"nodeId":"NODE-ap-south-1-a09becbb","score":0,"tier":"bronze"...}}
```

## Commit
37daa3c feat(S2-003): reputation scoring — 4 tiers, epoch-based, earnings multiplier

## Next Task
S2-004: Wire reputation to epoch close job
