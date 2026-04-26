# CURRENT TASK

**Status:** COMPLETED
**Task:** S2-009 + S2-010 (Offline Detection + Earnings Aggregation)
**Started:** April 26, 2026
**Completed:** April 26, 2026

## Summary
Offline detection and per-node earnings aggregation with tier multipliers.

## What Was Built

### S2-009 Offline Detection
- `apps/api/src/services/node_registry/offline_detector.js` (new)
- 3 missed heartbeats (6 min) → status = 'offline'
- Heartbeat on offline node → restore to 'active' + Discord alert
- Offline > 24 hours → status = 'suspended'
- GET /system/offline-detector status endpoint

### S2-010 Earnings Aggregation
- `apps/api/src/services/node_registry/earnings_aggregator.js` (new)
- node_earnings table with tier multipliers (platinum: 1.10x, gold: 1.00x, silver: 0.95x, bronze: 0.90x)
- Wired into epoch close job
- GET /api/nodes/:nodeId/earnings with per-epoch breakdown

## Verification
```bash
curl https://rpc.satelink.network/system/offline-detector
→ {"ok":true,"last_run_time":null,"last_status":null,...}

curl https://rpc.satelink.network/api/nodes/NODE-ap-south-1-a09becbb/earnings
→ {"ok":true,"earnings":{"total_earned_usdt":0,"pending_usdt":0,"epochs_participated":0,...}}
```

## Commit
568db79 feat(S2-009/010): offline detection + earnings aggregation

## S2 Progress
10/11 complete. Only S2-011 (documentation) remaining.
