# CURRENT TASK

**Status:** MONITORING

## Completed (May 11, 2026 — Dashboard Wiring to Live Backend)
- ✅ Tested all backend endpoints at rpc.satelink.network
- ✅ Created lib/api/satelink-api.ts with typed API client
- ✅ Wired admin overview to real /api/status, /api/epochs, /api/nodes, /rpc/metrics
- ✅ Wired node operator billing to real /api/nodes/:nodeId/earnings
- ✅ Both dashboards poll every 15s, SSE for live events
- ✅ Claim button wired to POST /api/nodes/:nodeId/claim

## Working Endpoints
| Endpoint | Status | Data |
|----------|--------|------|
| /health | ✅ | `{"status":"ok"}` |
| /api/status | ✅ | Network status, epoch, nodes, chains |
| /api/epochs | ✅ | **Real revenue data** with totals |
| /api/nodes | ✅ | Node registry with pagination |
| /api/nodes/:id/earnings | ✅ | Per-node earnings breakdown |
| /rpc/metrics | ✅ | Chain performance, revenue stats |
| /os/events | ✅ | SSE live event stream |

## Not Working
- /api/settlement/history → Error
- /api/pricing → Error

## Revenue Status
- Total tracked: $0.78+ across epochs
- 1029 requests in pending epoch
- Revenue generating on RPC calls

## Open PRs
- Chainlist Mainnet #2721: OPEN, awaiting reviews
- ethereum-lists/chains #8314: OPEN

## Next Priority
1. Monitor Chainlist PR for merge
2. Top up MATIC for on-chain claim testing
3. Add WebSocket RPC support (eth_subscribe)
4. Add eth_callBundle simulation endpoint

## Blocked On
- MATIC balance: ~0.06 — needs top-up for claim tests
