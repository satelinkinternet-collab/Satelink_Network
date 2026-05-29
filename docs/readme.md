# Satelink API Reference

Base URL: `https://rpc.satelink.network`

## Authentication

```bash
X-API-Key: YOUR_API_KEY
```

Get API key: `POST /api/keys` (free tier) or deposit USDT for paid tier.

## Rate Limits

- **Free tier:** 200 requests/day  
- **Paid tier:** Unlimited ($0.000030/call average)

## Endpoints

### RPC Gateway

```
POST /rpc/polygon
POST /rpc/polygon-amoy
POST /rpc/ethereum
POST /rpc/arbitrum
POST /rpc/base
```

Body: Standard JSON-RPC 2.0 request
Supports: eth_call, eth_blockNumber, eth_getBalance, eth_getLogs, etc.

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/keys` | Create API key |
| GET | `/api/keys/:key/usage` | Get usage stats |
| POST | `/api/keys/:key/deposit` | Verify USDT deposit, upgrade tier |
| GET | `/api/keys/:key/deposit-info` | Get deposit instructions |
| GET | `/api/keys/tiers` | List available tiers |

### Node Operators

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nodes/:nodeId/claim` | Claim USDT earnings |
| GET | `/api/nodes/:nodeId/stats` | Node performance |
| GET | `/api/nodes/:nodeId/earnings` | Epoch earnings history |

### Public Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with DB latency |
| GET | `/api/status` | Network status (nodes, uptime) |
| GET | `/api/pricing` | RPC method pricing catalog |

### Admin (X-Admin-Token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/diagnostics` | Full system state |
| GET | `/api/admin/economics` | Revenue breakdown |
| GET | `/api/admin/nodes` | Fleet status |
| GET | `/api/admin/settlement` | Pending settlements |
| GET | `/api/admin/summary` | Quick overview |
| POST | `/api/admin/notify` | Trigger Discord alert |

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Unauthorized (missing/invalid API key) |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Example: RPC Call

```bash
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_free_abc123" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Response:
```json
{"jsonrpc":"2.0","id":1,"result":"0x3a4b5c"}
```

## Example: Create API Key

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
  "daily_limit": 200
}
```

## Tier Pricing

| Tier | Daily Limit | Price/Month |
|------|-------------|-------------|
| Free | 200 | $0 |
| Basic | 10,000 | $9 |
| Pro | 100,000 | $49 |
| Enterprise | 1,000,000 | $199 |

## Support

- Dashboard: [app.satelink.network](https://app.satelink.network)
- Email: support@satelink.network
