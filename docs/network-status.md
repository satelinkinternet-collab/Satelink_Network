---
title: "Satelink network status and uptime monitoring"
description: "Check live Satelink RPC uptime, latency, active nodes, and per-service health, or pull the same metrics from the public status JSON API."
---

# Network status

Monitor live Satelink uptime, latency, and node health in real time.

The status page at [app.satelink.network/status](https://app.satelink.network/status) pulls metrics directly from `rpc.satelink.network/api/status` and auto-refreshes every 30 seconds.

## When to check the status page

Check it whenever you need to:

- Confirm whether an issue is on your side or ours before opening a support ticket.
- Verify uptime SLAs for billing or partner agreements.
- Monitor a chain or service before launching a production deploy.
- Track node-network health if you operate or depend on Satelink nodes.

For programmatic monitoring (PagerDuty, Grafana, custom dashboards), use the [status API](#status-api) directly.

## What you can see

The page reports the following at a glance:

| Metric | Description |
|---|---|
| **Overall status** | `operational`, `degraded`, or `outage` across the whole network. |
| **30-day uptime** | Rolling availability percentage. |
| **Average latency** | Median response time in milliseconds. |
| **Total requests (24h)** | Traffic served in the last 24 hours. |
| **Active nodes** | Nodes currently online and serving traffic. |
| **Current epoch** | The settlement epoch in progress. |
| **Per-service status** | RPC Gateway, AI Inference, Webhook Relay, Settlement Engine, Node Network, API Gateway. |
| **Supported chains** | Polygon, Ethereum, Arbitrum, Base, Optimism. |

Each service shows its individual uptime and current health.

## Auto-refresh

The page refreshes automatically every 30 seconds. You can also trigger a manual refresh with the refresh button. The "Last checked" timestamp shows when the most recent data was pulled.

## Status API

The same data is available as JSON for your own dashboards or alerts:

```bash
curl https://rpc.satelink.network/api/status
```

Response:

```json
{
  "status": "operational",
  "uptime_pct": 99.95,
  "avg_latency_ms": 45,
  "requests_24h": 1842301,
  "active_nodes": 87,
  "current_epoch": 142,
  "services": [
    { "name": "RPC Gateway", "status": "operational", "uptime": 99.99 },
    { "name": "Settlement Engine", "status": "operational", "uptime": 100 }
  ],
  "chains": ["polygon", "ethereum", "arbitrum", "base", "optimism"]
}
```

The endpoint is unauthenticated, returns `Cache-Control: no-store`, and is safe to poll from browsers.

### Recommended polling interval

- **Dashboards:** 30–60 seconds.
- **Health checks:** 60–120 seconds.
- **Incident alerting:** 15–30 seconds.

Aggressive polling below 10 seconds will be rate-limited.

## Status definitions

- **Operational** — all services responding within SLA thresholds.
- **Degraded** — at least one service is slower than its SLA or has elevated error rates. RPC traffic is still being served.
- **Outage** — a critical service is unavailable. Affected requests may fail or be queued.

## Related

- [API Reference](./api-reference) — endpoints, authentication, and error codes.
- [Quick start](./quick-start) — get your first RPC call working in two minutes.
- [SDK guide](./sdk-guide) — integrate Satelink with ethers, viem, or web3.js.
