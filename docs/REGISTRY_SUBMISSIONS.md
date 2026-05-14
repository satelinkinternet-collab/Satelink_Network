# Registry Submissions

Last updated: 2026-05-14

## npm Registry (passive discovery)

| Package | URL | Status |
|---------|-----|--------|
| @satelink/sdk | npmjs.com/package/@satelink/sdk | LIVE v0.2.0 |
| satelink-sdk | npmjs.com/package/satelink-sdk | LIVE v0.2.0 (fallback) |

### Next SDK versions
- v0.3.0: Add @satelink/react hooks
- v0.4.0: Add @satelink/cli (npx satelink)

## Submitted

| Registry | PR/Issue | Status | Notes |
|----------|----------|--------|-------|
| Chainlist (Amoy) | #2665 | MERGED | Testnet live |
| Chainlist (Polygon) | #2721 | OPEN | Needs 1 more approval |
| ethereum-lists | #8310 | MERGED | In official chains registry |

## TODO — Submit Immediately

### publicnode.com
Aggregates community RPCs, read by major bot infrastructure.

- URL: https://publicnode.com
- Submit: https://github.com/allnodes/allnodes/issues
- Discord: https://discord.gg/publicnode

**Submit:**
```
Network: Polygon Mainnet
RPC URL: https://rpc.satelink.network/rpc/polygon
Chain ID: 137
Provider: Satelink Network (DePIN)
Tracking: None
WebSocket: wss://rpc.satelink.network/rpc/ws/polygon
```

### polygon.technology Community RPC
Official Polygon docs — high visibility.

- Docs: https://wiki.polygon.technology/docs/operate/network-rpc-endpoints/
- Submit PR: https://github.com/0xPolygon/polygon-docs

### rpc.info
Community RPC aggregator.

- URL: https://rpc.info
- Submit: https://github.com/aragon/use-metamask/issues

### wagmi/viem Chains List
Used by every wagmi/viem dApp.

- URL: https://github.com/wevm/viem/tree/main/src/chains
- Add Satelink as alternative RPC for Polygon chain definition

### WalletConnect Cloud RPC
Every WalletConnect dApp uses this.

- URL: https://cloud.walletconnect.com/sign-in
- Register as RPC provider

### DeFiLlama RPC Tracker
- URL: https://defillama.com/rpc-tracker
- Already tracking via Chainlist submission

## Machine-Readable Endpoints

These are live and should be referenced in submissions:

| Endpoint | Purpose |
|----------|---------|
| `https://rpc.satelink.network/provider.json` | Provider metadata |
| `https://rpc.satelink.network/api/pricing` | RPC pricing catalog |
| `https://rpc.satelink.network/api/status` | Network status |

## Submission Template

```
Provider: Satelink Network
Description: Decentralized Physical Infrastructure (DePIN) RPC Gateway
Website: https://satelink.network
RPC Endpoint: https://rpc.satelink.network/rpc/polygon
Chain ID: 137
Network: Polygon Mainnet
Privacy: No wallet or IP logging
Tracking: None
Free Tier: 200 requests/day (no API key required)
Settlement: USDT on Polygon
Revenue Share: 50% to node operators
```
