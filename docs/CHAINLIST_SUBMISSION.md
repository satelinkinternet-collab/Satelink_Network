# Chainlist PR Submission — Satelink RPC

## Repository
https://github.com/DefiLlama/chainlist

## File to Edit
`constants/extraRpcs.js`

## PR Title
```
feat: Add Satelink RPC for Polygon Amoy (80002)
```

## PR Description
```markdown
## Summary
Adds Satelink DePIN Network as an RPC provider for Polygon Amoy testnet.

## RPC Details
- **URL:** `https://satelink-dashboard.vercel.app/gateway/rpc/amoy`
- **Chain ID:** 80002 (Polygon Amoy Testnet)
- **Tracking:** None — no user data collected, no analytics, no logging of wallet addresses
- **Rate Limit:** 100 requests/day (public tier, no API key required)
- **Provider:** Satelink Network (https://satelink.network)

## Verification
The endpoint returns valid JSON-RPC responses:
```bash
curl -X POST https://satelink-dashboard.vercel.app/gateway/rpc/amoy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Returns: `{"jsonrpc":"2.0","id":1,"result":"0x..."}`

## About Satelink
Satelink is a decentralized infrastructure network (DePIN) that routes RPC workloads through community-operated nodes with on-chain USDT settlement on Polygon. This is our first public RPC endpoint — we're starting with Polygon Amoy testnet and will expand to mainnet after verification.

## Checklist
- [x] RPC endpoint is publicly accessible
- [x] Returns valid JSON-RPC responses
- [x] No authentication required for basic usage
- [x] Privacy policy: no tracking of user data
```

## JSON Entry to Add

Find the `80002` (Polygon Amoy) section in `constants/extraRpcs.js` and add:

```javascript
{
  url: "https://satelink-dashboard.vercel.app/gateway/rpc/amoy",
  tracking: "none",
}
```

## Full Context

The file structure in `constants/extraRpcs.js` looks like:

```javascript
export const extraRpcs = {
  // ... other chains ...
  80002: {
    rpcs: [
      // existing RPCs...
      {
        url: "https://satelink-dashboard.vercel.app/gateway/rpc/amoy",
        tracking: "none",
      },
    ],
  },
  // ... other chains ...
};
```

## Steps to Submit

1. Fork https://github.com/DefiLlama/chainlist
2. Edit `constants/extraRpcs.js`
3. Find the `80002` key (Polygon Amoy)
4. Add the Satelink entry to the `rpcs` array
5. Create PR with title: `feat: Add Satelink RPC for Polygon Amoy (80002)`
6. Use the PR description above

## Expected Timeline
- PR review: 1-3 days
- Merge: depends on DefiLlama maintainers
- Live on chainlist.org: immediately after merge

---
*Created: April 2026*
*Status: READY TO SUBMIT*
