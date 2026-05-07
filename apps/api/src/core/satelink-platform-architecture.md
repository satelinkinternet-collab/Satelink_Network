# Satelink Platform API Architecture (NestJS-Ready)

This document defines the production backend target architecture while preserving the current Express runtime.

## Modules

- `auth`: Clerk/Auth.js integration boundary, JWT verification, role guards
- `projects`: project + environment ownership
- `nodes`: node registry, health, location, capability metadata
- `deployments`: infra graph deployments, rollout state machine
- `metrics`: latency, throughput, queue depth, health telemetry
- `analytics`: aggregated observability and economics rollups
- `notifications`: in-app + webhook dispatch
- `billing`: usage metering and economic settlement integration
- `websocket`: event gateway for live dashboard updates

## Event-Driven Contracts

- `deployment.created`
- `deployment.state.changed`
- `node.health.changed`
- `queue.depth.changed`
- `metrics.snapshot.generated`
- `billing.usage.metered`
- `notification.queued`

## Runtime Components

- PostgreSQL for source-of-truth records (deployments, nodes, billing)
- Redis for caching and pub/sub events
- BullMQ for durable background jobs
- WebSocket gateway for real-time streams to UI clients
- Prisma ORM for relational model access

## Directory Plan

```
apps/api/src/platform/
  modules/
    auth/
    projects/
    nodes/
    deployments/
    metrics/
    analytics/
    notifications/
    billing/
    websocket/
  shared/
    events/
    queue/
    guards/
    dto/
```

## Migration Strategy

1. Keep existing Express services live.
2. Introduce NestJS modules in parallel as adapters over current services.
3. Flip route groups incrementally behind feature flags.
4. Move background jobs to BullMQ workers with idempotency keys.
