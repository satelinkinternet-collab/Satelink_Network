# Registry Submission Tracker

Updated: 2026-05-12

## Status Summary

| Registry | Type | Status | Est. Traffic | Action |
|----------|------|--------|--------------|--------|
| Chainlist Amoy | Public | LIVE | testnet | done |
| Chainlist Mainnet | Public | 1/2 approvals | 1K-50K/day | wait |
| ethereum-lists | Official | MERGED | 500-5K/day | done |
| viem/wagmi | dApp infra | TODO | 500-5K/day | open PR |
| WalletConnect | dApp infra | TODO | 1K-10K/day | email |
| Chainbase | DeFi infra | TODO | 500-5K/day | open issue |
| 1inch | DeFi | TODO | 1K-20K/day | contact |
| dRPC | Aggregator | TODO | 1K-10K/day | submit |
| BlastAPI | Aggregator | TODO | 500-5K/day | submit |
| publicnode | Aggregator | TODO | 1K-10K/day | submit |

## Submission Queue (Priority Order)

### 1. wagmi/viem chains
**Impact:** Used by every wagmi/viem React dApp  
**URL:** https://github.com/wevm/viem/blob/main/src/chains/definitions/polygon.ts  
**Action:** Open PR adding Satelink to polygon chain's `rpcUrls.default.http` array  
**Entry:**
```typescript
rpcUrls: {
  default: {
    http: [
      'https://polygon-rpc.com',
      'https://rpc.satelink.network/rpc/polygon',  // Add this
    ],
  },
},
```

### 2. WalletConnect Cloud
**Impact:** Every dApp using WalletConnect  
**URL:** https://cloud.walletconnect.com  
**Contact:** hello@walletconnect.com  
**Subject:** Satelink DePIN RPC Provider — Polygon Mainnet  
**Body:**
```
Requesting listing as Polygon Mainnet RPC provider.

Provider: Satelink Network
Type: Decentralized Physical Infrastructure (DePIN)
RPC: https://rpc.satelink.network/rpc/polygon
Chain ID: 137
WebSocket: wss://rpc.satelink.network/rpc/ws/polygon
Tracking: None (no wallet/IP logging)
Uptime: 99.9%
```

### 3. Chainbase Network
**Impact:** DeFi data infrastructure  
**URL:** https://github.com/chainbase-labs/chainbase-network  
**Action:** Open GitHub issue requesting RPC integration  
**Content:**
```
Network: Polygon Mainnet (137)
RPC: https://rpc.satelink.network/rpc/polygon
Provider: Satelink Network (DePIN)
Type: Community decentralized provider
```

### 4. 1inch RPC Integration
**Impact:** Every 1inch aggregator user  
**URL:** https://github.com/1inch/1inch-sdk  
**Docs:** https://docs.1inch.io  
**Action:** Email/GitHub issue to integration team  

### 5. dRPC Aggregator
**URL:** https://drpc.org  
**Action:** Submit provider application  

### 6. BlastAPI
**URL:** https://blastapi.io  
**Action:** Submit provider application  

## Traffic Projections

**After All Registries Live:**

| Scenario | Requests/Day | Revenue/Day | Monthly |
|----------|-------------|-------------|---------|
| Conservative | 5K-20K | $1-4 | $30-120 |
| Moderate | 20K-100K | $4-20 | $120-600 |
| Optimistic | 100K+ | $20+ | $600+ |

## Submission Template

Use this for all submissions:

```
Provider: Satelink Network
Description: Decentralized Physical Infrastructure (DePIN) RPC Gateway
Website: https://satelink.network
RPC Endpoint: https://rpc.satelink.network/rpc/polygon
WebSocket: wss://rpc.satelink.network/rpc/ws/polygon
Chain ID: 137
Network: Polygon Mainnet
Privacy: No wallet or IP logging
Tracking: None
Settlement: USDT on Polygon (50% to node operators)
Status: https://rpc.satelink.network/api/status
Pricing: https://rpc.satelink.network/api/pricing
```

## Completed Submissions

### Chainlist Amoy #2665
- Submitted: 2026-05-08
- Merged: 2026-05-09
- Status: LIVE on chainlist.org

### ethereum-lists #8310
- Submitted: 2026-05-10
- Merged: 2026-05-11
- Status: In official chains registry
- Chains: Polygon (137), Ethereum (1), Arbitrum (42161), Base (8453), Polygon Amoy (80002)

### Chainlist Mainnet #2721
- Submitted: 2026-05-10
- Status: OPEN (1/2 approvals)
- URL: https://github.com/DefiLlama/chainlist/pull/2721
