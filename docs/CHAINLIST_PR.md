# Chainlist.org PR — Satelink RPC for Polygon Amoy

## Overview

Submit Satelink as a public RPC provider for Polygon Amoy testnet on [Chainlist.org](https://chainlist.org).

## PR Target

Repository: https://github.com/DefiLlama/chainlist
File to modify: `constants/extraRpcs.js`

## JSON to Add

Add to the `80002` (Polygon Amoy) section in `extraRpcs.js`:

```javascript
{
  url: "https://satelink-mvp.vercel.app/gateway/rpc/amoy",
  tracking: "none",
  trackingDetails: "Satelink DePIN Network - decentralized RPC relay with transparent pricing. No tracking, no logs. https://satelink.network/privacy"
}
```

## Full Entry Context

```javascript
// In extraRpcs.js, find chainId 80002 and add:
80002: {
  rpcs: [
    // ... existing RPCs ...
    {
      url: "https://satelink-mvp.vercel.app/gateway/rpc/amoy",
      tracking: "none",
      trackingDetails: "Satelink DePIN Network - decentralized RPC relay with transparent pricing. No tracking, no logs. https://satelink.network/privacy"
    }
  ],
  // ... rest of chain config
}
```

## PR Description Template

```markdown
## Add Satelink RPC for Polygon Amoy (chainId: 80002)

### RPC URL
`https://satelink-mvp.vercel.app/gateway/rpc/amoy`

### Provider Information
- **Name:** Satelink Network
- **Website:** https://satelink.network
- **Documentation:** https://docs.satelink.network/rpc
- **Status Page:** https://satelink-mvp.vercel.app/gateway/rpc/amoy (GET returns service info)

### Tracking Policy
- **Tracking:** None
- **Details:** Satelink is a decentralized infrastructure network. We do not log IP addresses, wallet addresses, or request contents. All RPC calls are processed by a distributed network of node operators with no central logging.

### Technical Details
- Supports standard Ethereum JSON-RPC 2.0
- WebSocket support: Coming soon
- Rate limits: None for public tier
- Pricing: Transparent per-request pricing (see docs)

### Testing
```bash
curl -X POST https://satelink-mvp.vercel.app/gateway/rpc/amoy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Chain Info
- Chain ID: 80002
- Network: Polygon Amoy Testnet
- Native Token: MATIC
```

## Pre-PR Checklist

- [ ] Vercel deployment live at `https://satelink-mvp.vercel.app`
- [ ] API route `/gateway/rpc/amoy` responding correctly
- [ ] CORS headers configured for browser access
- [ ] Test with MetaMask custom RPC
- [ ] Backend API deployed and `NEXT_PUBLIC_API_BASE` set in Vercel env

## Deployment Steps

1. **Deploy to Vercel:**
   ```bash
   cd apps/web
   vercel --prod
   ```

2. **Set environment variable in Vercel dashboard:**
   - `NEXT_PUBLIC_API_BASE` = `https://api.satelink.network` (or your backend URL)

3. **Verify endpoint:**
   ```bash
   curl https://satelink-mvp.vercel.app/gateway/rpc/amoy
   ```

4. **Submit PR to Chainlist repo**

## Notes

- The RPC endpoint has a fallback mode that calls Polygon Amoy directly if the backend is unavailable
- For production, ensure the Express backend is deployed (Railway, Render, or similar)
- The `/gateway/rpc/amoy` endpoint supports `x-api-key` header for authenticated requests
