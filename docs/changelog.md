# Changelog

## 2026-05-10 — Satelink OS Overview Render Loop Hotfix

### Fixed
- Resolved React infinite render loop (`Maximum update depth exceeded`) on `/satelink/os/overview`.
- Hardened realtime provider initialization to avoid duplicate listener registration and effect dependency recursion.
- Stabilized Zustand usage by removing inline `filter/map/find` selectors from subscriptions across OS pages/components.
- Moved scoped/derived collections to `useMemo` to prevent recursive snapshot churn during realtime updates.
- Added one-shot realtime engine bootstrap guard via `useRef` and centralized store writes through `useInfrastructureStore.getState()`.

### Verification
- `npm run build` passes (web routes, including `/satelink/os/overview`, compile successfully).
- No type/build regressions introduced in the modified Satelink OS components.

## 2026-05-08 — Satelink OS Operational Realism Sprint

### Added
- Advanced deployment lifecycle engine contract with multi-step runtime states.
- Runtime status bar in OS shell (network condition, nodes, queue pressure, relay latency, throughput, regions).
- Activity stream component with severity filters and scoped event rendering.
- Project/environment scoped deployment and terminal behavior.
- Design token module in `apps/web/src/lib/design-tokens.ts`.
- Event specification document in `docs/architecture/event-specification.md`.

### Updated
- Realtime simulation emits richer event set (deploy phases, queue spikes, routing/scaling/region events).
- Topology graph now renders queue pressure, GPU utilization hints, and traffic-sensitive edge styling.
- Globe pulse behavior synchronized with queue pressure and runtime condition.
- Deployment pages include lifecycle timeline visualization and scoped filtering.
- Backend realtime scaffolding expanded with advanced lifecycle states and topology event channel.

### Quality Notes
- Build and typecheck pass after sprint changes.
- Existing route structure and Satelink branding preserved.
- No production deployment actions performed.

## 2026-05-08 — Satelink OS Phase 2+ Deepening

### Added
- Stateful infrastructure store with typed modules and selectors.
- Realtime mock websocket simulation system for infrastructure events.
- Full Satelink OS route system with dedicated pages and shared layout shell.
- Deployment routes with terminal panel and deployment detail inspection.
- Keyboard-first route navigation (`G D`, `G N`, `G A`) and command palette continuity.
- Backend realtime scaffolding for event contracts, broadcaster, and websocket gateway.

### Updated
- `InfrastructureEditor` now reflects live store node health.
- `NetworkGlobe` now reacts to infrastructure health dynamics.
- `/satelink/os` now redirects to `/satelink/os/overview`.

### Quality Notes
- Build passes after changes.
- Added responsive shell and mobile navigation toggle.
- Maintained Satelink brand palette and dark infra visual language.
