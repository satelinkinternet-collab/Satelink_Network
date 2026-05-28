# Satelink Node Operator Guide

## 1. What is a Satelink Node?

A Satelink node is a router or VPS that earns USDT by serving RPC calls on behalf of the Satelink Network. Operators connect their machines to the network and are compensated based on the volume and quality of traffic they handle.

---

## 2. Requirements

| Item | Requirement |
|------|-------------|
| Internet | Stable connection required |
| IP Address | Static IP preferred |
| Runtime | Node.js 20+ |
| RAM | 512 MB minimum |

---

## 3. How to Register

Send a `POST` request to register your node:

```
POST https://rpc.satelink.network/api/nodes/register
```

**Request body:**
```json
{
  "wallet": "0xYOUR_POLYGON_WALLET",
  "region": "your-region",
  "endpoint": "your-rpc-url"
}
```

**Response:**
```json
{
  "nodeId": "...",
  "status": "registered"
}
```

Save the `nodeId` — you will need it for heartbeats and claims.

---

## 4. How Heartbeat Works

Your node must send a heartbeat every **60 seconds** to stay active:

```
POST https://rpc.satelink.network/api/nodes/heartbeat
```

**Request body:**
```json
{
  "nodeId": "...",
  "metrics": {
    "latency": 42,
    "uptime": 86400
  }
}
```

- `latency`: response time in milliseconds
- `uptime`: total uptime in seconds

> **Important:** Nodes that miss heartbeats for more than **5 minutes** are marked inactive and stop earning until heartbeats resume.

---

## 5. How Earnings Work

- **50%** of all platform revenue is distributed to active nodes each epoch.
- Your share is calculated as:

```
Your share = (your ops ÷ total network ops) × operator pool
```

- A higher **NETS reputation score** increases your proportional share of the operator pool.

---

## 6. How to Claim

**Check your balance:**
```
GET https://rpc.satelink.network/api/nodes/:nodeId/earnings
```

**Claim to your wallet:**
```
POST https://rpc.satelink.network/api/nodes/:nodeId/claim
```

> **Note:** There is a **48-day claim window** per epoch. Unclaimed earnings are returned to the treasury after the window closes.

---

## Support

- Email: satelinknetwork@gmail.com
- Docs: satelink.network/nodes
