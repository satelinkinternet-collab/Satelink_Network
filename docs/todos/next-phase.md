# Next Phase TODOs

## Realtime + Infrastructure
- Replace browser mock engine with backend websocket feed.
- Add reconnect/backoff strategy and connection quality indicator.
- Persist deployment logs server-side for historical playback.
- Add deterministic deployment scenario presets (healthy, degraded, rollback).

## UX + Product Polish
- Expand command palette into full global search and action execution.
- Add route transition choreography and skeleton variants for every OS page.
- Add richer empty states for low-data environments.
- Add compact keyboard shortcut cheat sheet overlay.

## Topology + Globe
- Add edge glow intensity based on queue/load. (partially complete)
- Add node click drill-down to deployment detail route.
- Add orbital lane overlays linked to active routes.

## Backend Deepening
- Wire `RealtimeEventBroadcaster` into deployment and queue services.
- Add Redis pub/sub transport for horizontal broadcaster scale.
- Add websocket auth and project-level channel permissions.

## Testing
- Add Playwright flow for keyboard navigation and deployment terminal behavior.
- Add unit tests for state machine transitions and event mapping.
- Add integration test for store optimistic deployment update path.
- Add visual regression checks for runtime status bar and activity stream.
