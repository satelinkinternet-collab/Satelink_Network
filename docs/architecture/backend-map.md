# Backend Map

## Machine Access Control Plane
- `apps/api/src/machine-access/contracts.js`
- `apps/api/src/machine-access/tables.js`
- `apps/api/src/machine-access/index.js`
- `apps/api/src/machine-access/auth.middleware.js`
- `apps/api/src/machine-access/token-hashing.service.js`
- `apps/api/src/machine-access/token.service.js`
- `apps/api/src/machine-access/permission-validator.service.js`
- `apps/api/src/machine-access/machine-identity.service.js`
- `apps/api/src/machine-access/environment-guard.service.js`
- `apps/api/src/machine-access/audit-logger.service.js`
- `apps/api/src/machine-access/rate-limiter.service.js`
- `apps/api/src/machine-access/replay-protection.service.js`
- `apps/api/src/machine-access/deployment-trigger.service.js`
- `apps/api/src/machine-access/observability-gateway.service.js`
- `apps/api/src/machine-access/websocket-auth.service.js`
- `apps/api/src/machine-access/redaction.js`

## Machine Access Contracts
- Internal-only machine identity layer mounted at `/machine-access/v1`.
- Token classes for audit, observability, deployment, CI, AI agents, infra admin, temporary sessions, and project scope.
- Fine-grained scope validator plus token-type policy enforcement.
- Approval-aware action queue for preview deploy/build/diagnostic/restart requests.
- Immutable-style audit log chaining with metadata redaction.

## Machine Access Flow
1. Admin issues or rotates a machine token via the admin plane.
2. Token service validates hashed secret material and resolves scopes from token type + role bindings.
3. Environment guard enforces environment, project, and future IP restrictions.
4. Observability gateway serves readonly infrastructure state.
5. Deployment trigger service queues safe action requests behind replay protection and approval rules.
6. Audit logger records every machine action.

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
- Topology update event contract for dynamic traffic overlays.
- Expanded lifecycle states to support provisioning/syncing/healthcheck/retry/rollback.

## Event-Driven Flow (Scaffold)
1. Service publishes event via `RealtimeEventBroadcaster`.
2. Gateway scaffold subscribes by event topic.
3. Websocket server fan-outs event payload to clients.
4. Frontend runtime maps events into project/environment scoped stores.

## Design Decisions
- Additive architecture only: no replacement of current Express runtime.
- Keep compatibility with future NestJS modularization.
- Keep interfaces typed for easy migration to DTO classes later.

## Known Issues
- Gateway scaffold is not attached to boot pipeline yet.
- No auth handshake on websocket scaffold yet.
- No durable event replay yet.
- No explicit backpressure control on event fan-out yet.

## Next Recommendations
- Attach broadcaster to deployment + queue modules behind feature flag.
- Add auth token validation for websocket clients.
- Add Redis-backed pub/sub for horizontal scaling.
