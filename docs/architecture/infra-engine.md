# Infrastructure Engine

## Engine Overview
Satelink OS currently runs a mock realtime infrastructure engine that simulates deployment lifecycle, node telemetry, queue pressure, routing updates, and regional activation events.

## Core Files
- `apps/web/src/lib/realtime/socket.ts`
- `apps/web/src/lib/events/infrastructure-events.ts`
- `apps/web/src/lib/mock-engine/infrastructure-engine.ts`
- `apps/web/src/components/satelink/realtime-provider.tsx`

## Event Types
- `deploy.started`
- `deploy.provisioning`
- `deploy.building`
- `deploy.deploying`
- `deploy.syncing`
- `deploy.routing`
- `deploy.healthcheck`
- `deploy.completed`
- `deploy.failed`
- `deploy.retrying`
- `deploy.rolled_back`
- `node.connected`
- `node.disconnected`
- `node.degraded`
- `queue.overloaded`
- `queue.spike`
- `routing.updated`
- `scaling.triggered`
- `telemetry.updated`
- `region.activated`
- `topology.updated`
- `metrics.tick`

## Flow
1. Engine emits typed events every ~2.2 seconds.
2. Provider consumes events and maps to store actions.
3. Store updates drive UI components (topology, terminal, metrics, notifications).

## State Synchronization
- Deployment events update deployment table + lifecycle progress + terminal stream.
- Node events patch node health + topology active state + runtime overlays.
- Queue events update queue model + warning notifications.
- Metrics/routing/region events append chart points and refresh runtime status bar.

## Known Issues
- Current engine is in-browser and non-deterministic.
- No persistence or replay for event stream.
- No multi-tab coordination yet.

## Next Recommendations
- Move mock engine behind feature switch.
- Replace engine with backend websocket stream.
- Introduce deterministic test mode for snapshots and E2E.
- Add lifecycle replay mode for deployment incident timelines.
