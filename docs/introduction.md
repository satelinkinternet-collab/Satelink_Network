---
title: "Satelink: decentralized Web3 RPC with USDT payouts"
description: "Satelink is a decentralized Web3 RPC network across Polygon, Ethereum, Arbitrum, and Base. Operators earn USDT for routing traffic."
---

Satelink is a decentralized RPC network. Developers get reliable Web3 RPC across Polygon, Ethereum, Arbitrum, and Base, and node operators earn USDT for serving traffic.

## What you can do

- **Build with RPC** — Call standard JSON-RPC methods on supported chains through a single gateway with usage-based pricing.
- **Run a node** — Route traffic from your server and claim 50% of the revenue your node generates, paid in USDT on Polygon.
- **Track earnings on-chain** — Settlements close every 60 seconds and are claimable from the public Claims contract.

## How it works

1. A developer sends a JSON-RPC request to `rpc.satelink.network` with an API key.
2. The gateway routes the call to a healthy node operator.
3. Revenue is recorded per call. Each epoch (60 seconds), earnings are split 50% to nodes, 30% platform, 20% distribution.
4. Node operators claim accumulated USDT from the Claims contract on Polygon.

## Pick your path

<CardGroup cols={2}>
  <Card title="Quick start" icon="rocket" href="/docs/quick-start">
    Make your first RPC call in two minutes with a free API key.
  </Card>
  <Card title="API reference" icon="code" href="/docs/api-reference">
    Endpoints for RPC, account management, nodes, and admin.
  </Card>
  <Card title="SDK guide" icon="cube" href="/docs/sdk-guide">
    Wire Satelink into ethers.js, viem, web3.js, and more.
  </Card>
  <Card title="Run a node" icon="server" href="/docs/node-operators">
    Earn USDT by routing RPC traffic from your own server.
  </Card>
</CardGroup>

## Supported chains

| Chain | Endpoint | Chain ID |
|-------|----------|----------|
| Polygon | `/rpc/polygon` | 137 |
| Polygon Amoy | `/rpc/polygon-amoy` | 80002 |
| Ethereum | `/rpc/ethereum` | 1 |
| Arbitrum | `/rpc/arbitrum` | 42161 |
| Base | `/rpc/base` | 8453 |

## Example request

```bash
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Pricing at a glance

| Tier | Daily limit | Monthly price |
|------|-------------|---------------|
| Free | 200/day | $0 |
| Basic | 10,000/day | $9 |
| Pro | 100,000/day | $49 |
| Enterprise | 1,000,000/day | $199 |

See [pricing](/docs/pricing) for per-method costs and upgrade instructions.
