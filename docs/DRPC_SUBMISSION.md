# dRPC Partner Registration — Satelink Network

## Registration URL
https://drpc.org/partners

## Provider Information

### Basic Info
| Field | Value |
|-------|-------|
| **Provider Name** | Satelink Network |
| **Website** | https://satelink.network |
| **Contact Email** | rbpradip@gmail.com |
| **Company Type** | DePIN (Decentralized Physical Infrastructure Network) |

### Technical Details
| Field | Value |
|-------|-------|
| **Infrastructure Type** | Decentralized node network |
| **Node Count** | 5+ (growing) |
| **Geographic Distribution** | Global |
| **Uptime SLA** | 99.5% target |

### Supported Networks

| Chain | Chain ID | Endpoint | Status |
|-------|----------|----------|--------|
| Polygon Amoy (Testnet) | 80002 | `https://satelink-dashboard.vercel.app/gateway/rpc/amoy` | Live |
| Polygon PoS (Mainnet) | 137 | Coming Q3 2026 | Planned |

### RPC Capabilities
- [x] eth_blockNumber
- [x] eth_getBalance
- [x] eth_call
- [x] eth_estimateGas
- [x] eth_sendRawTransaction
- [x] eth_getTransactionReceipt
- [x] eth_getLogs
- [x] eth_getBlockByNumber
- [x] eth_getBlockByHash
- [x] eth_getTransactionByHash
- [x] eth_getCode
- [x] eth_getStorageAt
- [x] net_version
- [x] web3_clientVersion

### Privacy & Compliance
| Aspect | Status |
|--------|--------|
| **Data Tracking** | None — no wallet addresses logged |
| **Analytics** | Aggregated billing only (no PII) |
| **GDPR Compliant** | Yes |
| **Request Logging** | Method + timestamp only (for billing) |

### Pricing Model
| Tier | Rate Limit | Price |
|------|------------|-------|
| Public (no key) | 100 req/day | Free |
| Basic API Key | 10,000 req/day | $5/month |
| Pro API Key | 100,000 req/day | $25/month |
| Enterprise | Unlimited | Custom |

### Differentiators
1. **On-chain Settlement** — All billing anchored to Polygon with verifiable transactions
2. **Decentralized Nodes** — Not a single datacenter, distributed across community operators
3. **Revenue Sharing** — 50% of revenue goes to node operators
4. **No Vendor Lock-in** — Standard JSON-RPC, works with any client

### Integration Request
We are requesting to be added as an RPC provider option in dRPC's aggregated endpoint service for:
- Polygon Amoy (testnet) — immediate
- Polygon Mainnet — Q3 2026

### Verification Command
```bash
curl -X POST https://satelink-dashboard.vercel.app/gateway/rpc/amoy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected response:
```json
{"jsonrpc":"2.0","id":1,"result":"0x..."}
```

### Additional Notes
Satelink is a DePIN project focused on building autonomous infrastructure that machines and protocols can consume without human intervention. Our RPC service is the first workload type, with AI inference and bandwidth proxy coming in later stages.

We're starting with Polygon Amoy to prove the billing and settlement pipeline, then expanding to mainnet once we've demonstrated reliable operation.

---
*Created: April 2026*
*Status: READY TO SUBMIT*
