# BUG LOG

## Template
```
### BUG-XXX: <title>
- **Reported**: YYYY-MM-DD
- **Severity**: critical | high | medium | low
- **Status**: open | investigating | resolved
- **File(s)**: path/to/file.js
- **Description**: What went wrong
- **Root Cause**: (fill when known)
- **Fix**: (fill when resolved)
```

---

## Open Bugs

### BUG-005: Alchemy demo key 429 on WS
- **Reported**: 2026-04-25
- **Severity**: low
- **Status**: known/acceptable
- **File(s)**: apps/api/src/workloads/rpc_gateway/ws_gateway.js
- **Description**: WebSocket connections to Alchemy demo key get 429 rate limited
- **Root Cause**: Demo API key has strict rate limits
- **Fix**: Add WS_POLYGON_AMOY env var with real Alchemy API key
- **Impact**: WS subscriptions fall back to polling, not blocking

## Resolved Bugs

_(none yet)_
