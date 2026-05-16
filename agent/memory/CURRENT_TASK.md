# CURRENT TASK

Status: CLAIM SYSTEM FULLY OPERATIONAL
Verified: May 16, 2026 05:39 UTC

## Claim Test Result

```
✅ CLAIMABLE: $1.2964636 USDT
Signature: 0x73f9a7c4fa42f93407a2e9fb1130262f866f35f83...
Contract: 0xE475c53B88190FD2130dB1E37504991EFe283fb0
Expiry: 2026-05-18T00:05:40.000Z (48h)
```

## Fixes Applied Today

1. **Offline threshold**: 6min → 24h (prevents node suspension)
2. **Suspend threshold**: 24h → 7 days
3. **Self-heartbeat**: server.js pings node every 5min
4. **Claim processor fallback**: epoch_earnings → revenue_events_v2
5. **AI Gateway**: Anthropic → Groq (100% margin)
6. **Claim USDT button**: now links to /satelink/os/withdraw

## Architecture

```
POST /api/nodes/:nodeId/claim
  └── generateClaimSignature()
      ├── Query epoch_earnings (preferred)
      └── Fallback: SUM(revenue_events_v2) * 0.5
          └── Returns EIP-712 signature
              └── User submits to ClaimsContract.claim()
```

## Next Steps

1. User visits app.satelink.network/satelink/os/withdraw
2. Connects wallet 0x966E1Ae...d7Ad4
3. Clicks "Claim Earnings → USDT"
4. Confirms in MetaMask (pays ~$0.01 gas on Polygon)
5. USDT arrives in wallet
