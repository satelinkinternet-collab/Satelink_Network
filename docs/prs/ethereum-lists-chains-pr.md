# ethereum-lists/chains PR — Add Satelink RPC Endpoints

**Repository:** https://github.com/ethereum-lists/chains
**PR Type:** Add RPC endpoints to existing chain definitions
**Status:** READY TO SUBMIT

## Overview

Satelink Network is a DePIN RPC provider offering decentralized infrastructure endpoints
for Polygon, Ethereum, Arbitrum, and Base. This PR adds our public RPC URLs to the
official ethereum-lists/chains registry.

## Changes Required

### 1. `_data/chains/eip155-137.json` (Polygon Mainnet)

Add to `rpc` array:
```json
"https://rpc.satelink.network/rpc/polygon",
"wss://rpc.satelink.network/rpc/ws/polygon"
```

### 2. `_data/chains/eip155-80002.json` (Polygon Amoy Testnet)

Add to `rpc` array:
```json
"https://rpc.satelink.network/rpc/amoy"
```

### 3. `_data/chains/eip155-1.json` (Ethereum Mainnet)

Add to `rpc` array:
```json
"https://rpc.satelink.network/rpc/ethereum"
```

### 4. `_data/chains/eip155-42161.json` (Arbitrum One)

Add to `rpc` array:
```json
"https://rpc.satelink.network/rpc/arbitrum"
```

### 5. `_data/chains/eip155-8453.json` (Base)

Add to `rpc` array:
```json
"https://rpc.satelink.network/rpc/base"
```

## PR Template

**Title:** `feat: add Satelink Network RPC endpoints`

**Body:**
```markdown
## Summary

Adds Satelink Network RPC endpoints to Polygon, Ethereum, Arbitrum, and Base chains.

## About Satelink

- **Website:** https://satelink.network
- **Status:** https://rpc.satelink.network/api/status
- **Provider Metadata:** https://rpc.satelink.network/provider.json
- **Chainlist:** Already listed (Amoy merged, Mainnet PR #2721 pending)

## Endpoints Added

| Chain | ChainId | Endpoint |
|-------|---------|----------|
| Polygon Mainnet | 137 | `https://rpc.satelink.network/rpc/polygon` |
| Polygon Mainnet (WSS) | 137 | `wss://rpc.satelink.network/rpc/ws/polygon` |
| Polygon Amoy | 80002 | `https://rpc.satelink.network/rpc/amoy` |
| Ethereum Mainnet | 1 | `https://rpc.satelink.network/rpc/ethereum` |
| Arbitrum One | 42161 | `https://rpc.satelink.network/rpc/arbitrum` |
| Base | 8453 | `https://rpc.satelink.network/rpc/base` |

## Verification

All endpoints return valid JSON-RPC responses:

```bash
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Returns: {"jsonrpc":"2.0","id":1,"result":"0x89"}
```

## Privacy

- No wallet address logging
- No IP address logging
- Privacy policy: https://satelink.network/legal/privacy
```

## Submission Steps

1. Fork https://github.com/ethereum-lists/chains
2. Create branch: `feat/add-satelink-rpc`
3. Edit the 5 chain files listed above
4. Run validation: `npm test`
5. Commit: `feat: add Satelink Network RPC endpoints`
6. Open PR to `master` branch

## Expected Review Time

Typically 1-2 weeks for ethereum-lists PRs.
