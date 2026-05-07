# Backend Map

## New Backend Foundation Files
- `apps/api/src/realtime/contracts.ts`
- `apps/api/src/realtime/deployment-state-machine.ts`
- `apps/api/src/realtime/event-broadcaster.ts`
- `apps/api/src/realtime/websocket-gateway-scaffold.ts`
- `apps/api/src/core/satelink-platform-architecture.md`
- `apps/api/sql/prisma_satelink_schema.prisma`

## Module Contracts
- Deployment lifecycle contracts with state model.
- Queue and node telemetry contracts for event-driven streams.
- Realtime broadcaster abstraction for topic-based publish/subscribe.

## Event-Driven Flow (Scaffold)
1. Service publishes event via `RealtimeEventBroadcaster`.
2. Gateway scaffold subscribes by event topic.
3. Websocket server fan-outs event payload to clients.

## Design Decisions
- Additive architecture only: no replacement of current Express runtime.
- Keep compatibility with future NestJS modularization.
- Keep interfaces typed for easy migration to DTO classes later.

## Known Issues
- Gateway scaffold is not attached to boot pipeline yet.
- No auth handshake on websocket scaffold yet.
- No durable event replay yet.

## Next Recommendations
- Attach broadcaster to deployment + queue modules behind feature flag.
- Add auth token validation for websocket clients.
- Add Redis-backed pub/sub for horizontal scaling.
