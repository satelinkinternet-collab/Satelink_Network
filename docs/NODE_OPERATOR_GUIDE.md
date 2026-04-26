# Satelink Node Operator Guide

## What is a Satelink Node?
A Satelink node is a server that processes RPC requests for DeFi protocols,
AI agents, and machine workloads. You earn 50% of all revenue your node generates,
paid in USDT on Polygon. No staking required.

## Earnings Model
- You earn 50% of every RPC call routed through your node
- Rate: $0.00003 USDT per RPC call (varies by chain and method)
- At 10,000 calls/day: ~$0.15/day = ~$4.50/month
- At 100,000 calls/day: ~$1.50/day = ~$45/month
- Tier multipliers: Bronze 0.9x | Silver 0.95x | Gold 1.0x | Platinum 1.1x
- Minimum claim: 1 USDT | Paid on Polygon mainnet

## Hardware Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 512 MB | 2 GB |
| Bandwidth | 10 Mbps | 100 Mbps |
| Uptime | 95%+ | 99%+ |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 |

## Reputation Tiers
Your reputation score (0-1000) determines your tier and earnings multiplier:
- Bronze (0-199): 1,000 RPC calls/day limit, 0.9x earnings
- Silver (200-399): 5,000 calls/day, 0.95x earnings
- Gold (400-699): 20,000 calls/day, 1.0x earnings
- Platinum (700-1000): Unlimited calls, 1.1x earnings bonus

Score increases by sending regular heartbeats and serving RPC calls.

## Quick Setup

### Step 1: Register your node
```bash
POST https://rpc.satelink.network/api/nodes/register
{
  "wallet_address": "0xYOUR_WALLET",
  "node_type": "rpc",
  "endpoint_url": "https://your-server.com",
  "region": "ap-south-1",
  "chain_ids": [80002, 137, 1]
}
```

### Step 2: Send heartbeats (every 2 minutes)
```bash
POST https://rpc.satelink.network/api/nodes/{nodeId}/heartbeat
{
  "cpu_pct": 12,
  "ram_pct": 34,
  "uptime_seconds": 86400,
  "rpc_calls_served": 1000
}
```

### Step 3: Monitor earnings
```bash
GET https://rpc.satelink.network/api/nodes/{nodeId}/earnings
GET https://rpc.satelink.network/api/nodes/{nodeId}/reputation
```

### Step 4: Claim when ready (minimum 1 USDT)
Claims processed within 24 hours of epoch close.
Paid in USDT to your registered wallet on Polygon.

## API Endpoints Reference
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/nodes/register | POST | Register a new node |
| /api/nodes/{id}/heartbeat | POST | Send heartbeat |
| /api/nodes/{id}/earnings | GET | View earnings |
| /api/nodes/{id}/reputation | GET | View score + tier |
| /api/nodes/{id}/health | GET | View health history |
| /api/nodes | GET | Browse all nodes |

## Support
- Discord: Coming soon (satelink.network/discord)
- Email: satelinknetwork@gmail.com
- Docs: satelink.network/nodes
