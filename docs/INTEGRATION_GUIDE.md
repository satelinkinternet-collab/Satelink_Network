# Satelink Integration Guide

How to route traffic to Satelink (for machines and developers).

## JSON-RPC (Ethereum Compatible)

Replace your current RPC URL with:

| Network | URL | Status |
|---------|-----|--------|
| Polygon Amoy (testnet) | `https://rpc.satelink.network/gateway/rpc/amoy` | Live |
| Polygon Mainnet | `https://rpc.satelink.network/gateway/rpc/polygon` | Coming Soon |

### Quick Test

```bash
curl -X POST https://rpc.satelink.network/gateway/rpc/amoy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected response:
```json
{"jsonrpc":"2.0","result":"0x...","id":1}
```

### Supported Chains

| Chain | Endpoint Path | Chain ID |
|-------|---------------|----------|
| Polygon Amoy | `/gateway/rpc/amoy` | 80002 |
| Polygon | `/gateway/rpc/polygon` | 137 |
| Ethereum | `/gateway/rpc/ethereum` | 1 |
| Arbitrum | `/gateway/rpc/arbitrum` | 42161 |
| Base | `/gateway/rpc/base` | 8453 |

## Authentication

### Free Tier (No API Key)
- 100 requests/day limit
- No authentication required
- Ideal for testing and light usage

### API Key (Higher Limits)
```bash
# Get an API key
curl -X POST https://api.satelink.network/api/builder/keys \
  -H "Authorization: Bearer <your-jwt>"

# Use the API key
curl -X POST https://rpc.satelink.network/gateway/rpc/amoy \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_..." \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Pricing

Get current pricing:
```bash
curl https://api.satelink.network/api/pricing
```

Example response:
```json
{
  "ok": true,
  "provider": "Satelink",
  "pricing": {
    "rpc": {
      "eth_blockNumber": 0.000001,
      "eth_call": 0.000015,
      "eth_sendRawTransaction": 0.0001
    },
    "model": "pay_per_use",
    "minimum_deposit_usdt": 1.0,
    "settlement": "USDT on Polygon"
  }
}
```

## Network Status

Check network health:
```bash
curl https://api.satelink.network/api/status
```

## Chainlist Integration

Satelink is listed on [Chainlist.org](https://chainlist.org). Add Satelink as a custom RPC in MetaMask or any wallet by searching for "Satelink" on Chainlist.

## Node.js SDK (Coming in Stage S2)

```javascript
npm install @satelink/sdk

const { SatelinkRPC } = require('@satelink/sdk');

const rpc = new SatelinkRPC({
  apiKey: 'sk_...',
  chain: 'amoy'
});

const block = await rpc.getBlockNumber();
console.log('Current block:', block);
```

## Support

- Documentation: https://docs.satelink.network
- Discord: https://discord.gg/satelink
- Email: support@satelink.network
