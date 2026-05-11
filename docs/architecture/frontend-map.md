# Frontend Map

## Route Structure
- `apps/web/src/app/satelink/page.tsx` — premium landing
- `apps/web/src/app/satelink/os/layout.tsx` — shared OS layout wrapper
- `apps/web/src/app/satelink/os/page.tsx` — redirect index
- `apps/web/src/app/satelink/os/overview/page.tsx`
- `apps/web/src/app/satelink/os/nodes/page.tsx`
- `apps/web/src/app/satelink/os/deployments/page.tsx`
- `apps/web/src/app/satelink/os/deployments/[id]/page.tsx`
- `apps/web/src/app/satelink/os/network/page.tsx`
- `apps/web/src/app/satelink/os/analytics/page.tsx`
- `apps/web/src/app/satelink/os/queue/page.tsx`
- `apps/web/src/app/satelink/os/projects/page.tsx`
- `apps/web/src/app/satelink/os/settings/page.tsx`
- `apps/web/src/app/satelink/os/billing/page.tsx`
- `apps/web/src/app/satelink/os/team/page.tsx`
- `apps/web/src/app/satelink/os/notifications/page.tsx`

## Components Added
- `components/satelink/os-shell.tsx` — responsive shell + keyboard navigation
- `components/satelink/os-page-template.tsx` — consistent page framing
- `components/satelink/realtime-provider.tsx` — realtime simulation binding
- `components/satelink/deployment-terminal.tsx` — streaming terminal-like panel
- `components/satelink/infrastructure-editor.tsx` — store-driven topology view
- `components/satelink/network-globe.tsx` — store-driven pulse intensity
- `components/satelink/runtime-status-bar.tsx` — persistent runtime health layer
- `components/satelink/activity-stream.tsx` — realtime infra feed with filters
- `components/satelink/deployment-lifecycle-timeline.tsx` — deployment phase progress view

## State Architecture
- Zustand store `useInfrastructureStore` is primary runtime state.
- Selectors:
  - `selectActiveDeployments`
  - `selectHealthyNodeCount`
  - `selectScopedActivity`
- Scoped slices:
  - active project + environment filtering for deployments/logs/activity
  - runtime status model (`networkStable`, `relayLatencyMs`, `deploymentThroughput`, `activeRegions`)

## Keyboard UX
- `Cmd/Ctrl + K` command palette.
- Sequence navigation in shell:
  - `G D` deployments
  - `G N` nodes
  - `G A` analytics

## Responsive Notes
- Collapsible mobile sidebar in `os-shell`.
- Card grids use responsive breakpoints and avoid fixed-width columns.
- Deployment terminal supports constrained viewport height and vertical scroll.
- Runtime bar remains compact and readable from mobile to desktop.

## Known Frontend Gaps
- Command palette actions are currently static quick actions.
- Cross-page transition motion can be further refined for Linear-grade feel.
- Graph uses seeded layout; dynamic drag persistence is pending.
