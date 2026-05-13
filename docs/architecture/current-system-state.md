# Current System State

## What Was Built
- Added Machine Access control-plane backend under `apps/api/src/machine-access/*`.
- Added internal admin UX scaffold under `apps/web/src/app/internal/access/*`.
- Added machine identity tables for tokens, identities, audit logs, and action requests.
- Added readonly observability endpoints plus preview action request scaffolding at `/machine-access/v1/*`.
- Added safe AI agent sandbox policy with preview-only mutation capability and explicit denial of secrets/admin/runtime destructive access.
- Added stateful Satelink OS core with Zustand store in `apps/web/src/store/useInfrastructureStore.ts`.
- Added realtime simulation system via:
  - `apps/web/src/lib/events/infrastructure-events.ts`
  - `apps/web/src/lib/realtime/socket.ts`
  - `apps/web/src/lib/mock-engine/infrastructure-engine.ts`
  - `apps/web/src/components/satelink/realtime-provider.tsx`
- Introduced full Satelink OS shell and route segmentation under `apps/web/src/app/satelink/os/*`.
- Added deployment terminal UX and deployment detail inspection routes.
- Added backend realtime scaffolding under `apps/api/src/realtime/*`.
- Added operational realism layer:
  - deployment lifecycle progression (`queued` -> `active` with retry/failure paths)
  - runtime status bar in shared OS shell
  - activity stream with severity filtering
  - project/environment scoped data handling for deployments and logs
  - design token source file for visual consistency
- Added realtime/render safety hardening:
  - provider bootstrap guard to prevent duplicate mock-engine/listener initialization
  - stable Zustand subscriptions (no inline derived arrays in selectors)
  - memoized scoped/derived deployment, activity, and log views to avoid recursive rerenders

## Routes Added
- `/internal/access`
- `/internal/access/tokens`
- `/internal/access/audit`
- `/internal/access/agents`
- `/satelink/os/overview`
- `/satelink/os/nodes`
- `/satelink/os/deployments`
- `/satelink/os/deployments/[id]`
- `/satelink/os/network`
- `/satelink/os/analytics`
- `/satelink/os/queue`
- `/satelink/os/projects`
- `/satelink/os/settings`
- `/satelink/os/billing`
- `/satelink/os/team`
- `/satelink/os/notifications`
- `/satelink/os` now redirects to `/satelink/os/overview`

## State Architecture
- Single source of UI runtime truth in Zustand:
  - deployments, nodes, topology, queue, runtime, metrics, logs, notifications, events, activity stream
  - environment/project switching
  - optimistic upsert and append flows for live updates
  - scoped views by active project + active environment

## Websocket/Event Flow
- Mock channel emits typed infra events.
- Realtime provider maps events into store updates.
- Deploy events generate timeline/log/notification updates.
- Queue overload events generate warnings and metrics drift.
- Routing/scaling/region events update runtime status layer.
- Node events now influence topology runtime overlays and globe pulse intensity.

## Design Decisions
- Preserve Satelink palette and dark infrastructure style.
- Keep premium spacing and low-noise visuals.
- Use shared `SatelinkOsShell` + `OsPageTemplate` for consistency and maintainability.
- Evolve the Express monolith by adding a Nest-compatible module shape for Machine Access instead of rewriting the runtime.

## Backend Contracts
- Typed event contracts for deployment/node/queue telemetry.
- Stateful deployment transition helpers and broadcaster scaffold.
- Non-invasive: no production runtime wiring changed yet.
- Machine Access contracts now define token classes, scopes, replay protection, audit chaining, and preview-only safe action lanes.

## Known Issues
- Realtime feed currently mock-only (no backend websocket bridge enabled in runtime).
- Deployment terminal uses simulated event logs.
- Command palette actions are not yet fully bound to scoped operational commands.

## Next Recommendations
- Wire backend `RealtimeEventBroadcaster` into live gateway and queue services.
- Add persistence for deployment logs and activity stream.
- Add E2E tests for route keyboard navigation and deployment detail flow.
- Add deterministic replay mode for incident forensics and postmortem views.
- Connect Machine Access action requests to real Vercel/Railway/Cloudflare executors behind approval gates.
