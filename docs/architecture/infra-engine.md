# Infrastructure Engine

## Engine Overview
Satelink OS currently runs a mock realtime infrastructure engine that simulates deployment, node, queue, and metrics events.

## Core Files
- `apps/web/src/lib/realtime/socket.ts`
- `apps/web/src/lib/events/infrastructure-events.ts`
- `apps/web/src/lib/mock-engine/infrastructure-engine.ts`
- `apps/web/src/components/satelink/realtime-provider.tsx`

## Event Types
- `deploy.started`
- `deploy.building`
- `deploy.completed`
- `deploy.failed`
- `node.connected`
- `node.degraded`
- `queue.overloaded`
- `metrics.tick`

## Flow
1. Engine emits typed events every ~2.2 seconds.
2. Provider consumes events and maps to store actions.
3. Store updates drive UI components (topology, terminal, metrics, notifications).

## State Synchronization
- Deployment events update deployment table + log stream.
- Node events patch node health + topology active state.
- Queue events update queue model + warning notifications.
- Metrics events append chart points.

## Known Issues
- Current engine is in-browser and non-deterministic.
- No persistence or replay for event stream.
- No multi-tab coordination yet.

## Next Recommendations
- Move mock engine behind feature switch.
- Replace engine with backend websocket stream.
- Introduce deterministic test mode for snapshots and E2E.
