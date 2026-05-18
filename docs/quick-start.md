---
title: "Quick start"
description: "Make your first Satelink JSON-RPC call in two minutes, with a free API key and any supported chain."
---

Get your first RPC call running in 2 minutes.

## Step 1: Get API Key

Visit [app.satelink.network/plans](https://app.satelink.network/satelink/os/plans) or create via API:

```bash
curl -X POST https://rpc.satelink.network/api/keys \
  -H "Content-Type: application/json" \
  -d '{"tier":"free"}'
```

Response:
```json
{
  "ok": true,
  "api_key": "sk_free_abc123def456",
  "tier": "free",
  "daily_limit": 200,
  "example": "curl -X POST https://rpc.satelink.network/rpc/polygon -H 'X-API-Key: sk_free_abc123def456' ..."
}
```

## Step 2: Make Your First Call

```bash
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Response:
```json
{"jsonrpc":"2.0","id":1,"result":"0x3a4b5c6"}
```

## Step 3: Check Your Usage

```bash
curl https://rpc.satelink.network/api/keys/YOUR_API_KEY/usage
```

Response:
```json
{
  "ok": true,
  "tier": "free",
  "daily_limit": 200,
  "used_today": 1,
  "remaining": 199,
  "reset_at": "2026-05-19T00:00:00Z"
}
```

## Supported Chains

| Chain | Endpoint | Chain ID |
|-------|----------|----------|
| Polygon | `/rpc/polygon` | 137 |
| Polygon Amoy | `/rpc/polygon-amoy` | 80002 |
| Ethereum | `/rpc/ethereum` | 1 |
| Arbitrum | `/rpc/arbitrum` | 42161 |
| Base | `/rpc/base` | 8453 |

## Rate Limits

| Tier | Daily Limit | Price |
|------|-------------|-------|
| Free | 200/day | $0 |
| Basic | 10,000/day | $9/month |
| Pro | 100,000/day | $49/month |
| Enterprise | 1,000,000/day | $199/month |

## Upgrade to Paid Tier

1. Get deposit address: `GET /api/keys/YOUR_KEY/deposit-info`
2. Send USDT to treasury on Polygon
3. Submit TX hash: `POST /api/keys/YOUR_KEY/deposit`
4. Instant upgrade — no waiting

## Next steps

- [API reference](/docs/api-reference) — Full endpoint documentation
- [SDK integration](/docs/sdk-guide) — JavaScript/TypeScript SDK
- [Node operator guide](/docs/node-operators) — Earn USDT by running a node
- [Pricing details](/docs/pricing) — Full pricing breakdown
