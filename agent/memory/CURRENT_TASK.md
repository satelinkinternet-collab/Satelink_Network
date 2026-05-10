# CURRENT TASK

**Status:** IN_PROGRESS

## Current (May 10, 2026)
- Added autonomous revenue accelerators (provider.json, llms.txt, robots.txt updates)
- Homepage rebuilt per master guide with 7 semantic sections
- EIP-1193 compliance verified
- All live endpoints checked

## Next Priority
1. Fix /api/pricing internal_error (pool query failing)
2. Wire RealtimeEventBroadcaster to live revenue/epoch events
3. Submit ethereum-lists/chains PR for Polygon mainnet

## Blocked On
- Chainlist Mainnet PR #2721: OPEN, awaiting 2 reviews
- MATIC balance: 0.06 — needs top-up for on-chain claims test

## Websocket Wiring TODO
- Add revenue:event, epoch:closed, claim:generated to contracts.ts
- Wire broadcaster into recordRpcRevenue(), closeEpoch(), /claim route
- Start websocket gateway on Railway (port 8181 or via /rpc/ws/events)
- Update frontend socket.ts to connect to live wss endpoint
