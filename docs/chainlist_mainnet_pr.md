# Chainlist Mainnet PR Instructions

## What to do
1. Go to: https://github.com/DefiLlama/chainlist
2. Find file: `_data/chains/eip155-137.json`
3. Click Edit (fork and edit)
4. Find the `"rpc"` array
5. Add this entry to the rpc array:
   ```
   "https://rpc.satelink.network/rpc/polygon"
   ```
6. PR title: `Add Satelink public RPC for Polygon Mainnet (137)`
7. PR body:

---

## Summary
Adds Satelink DePIN Network as a public RPC provider for Polygon Mainnet.

## RPC Details
- **URL:** `https://rpc.satelink.network/rpc/polygon`
- **Chain ID:** 137 (Polygon Mainnet)
- **Tracking:** None — no user data, wallet addresses, or IPs collected
- **Rate Limit:** 1000 requests/day free tier, no API key required
- **Provider:** Satelink Network — Decentralized Physical Infrastructure (DePIN)
- **Website:** https://satelink.network

## Verification
```bash
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Returns: `{"jsonrpc":"2.0","id":1,"result":"0x..."}`

## About Satelink
Satelink is a decentralized infrastructure network (DePIN) that routes RPC workloads through community-operated nodes with on-chain USDT settlement on Polygon. Our testnet RPC (Polygon Amoy, PR #2665) was merged — this adds our production mainnet endpoint.

---

## Alternative: extraRpcs.js format

If the chainlist repo uses `constants/extraRpcs.js` instead of JSON files, add to the `137` key:

```javascript
137: {
  rpcs: [
    // ... existing entries ...
    {
      url: "https://rpc.satelink.network/rpc/polygon",
      tracking: "none",
      trackingDetails: "Satelink does not log wallet addresses, IP addresses, or request contents."
    }
  ]
}
```

---

*Created: May 2026*
