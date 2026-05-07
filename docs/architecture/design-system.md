# Satelink Design System

## Brand Palette
- Background: `#091413`
- Primary: `#408A71`
- Secondary: `#285A48`
- Light Contrast: `#B0E4CC`
- Accent Glow: `#00D1FF`

## Visual Principles
- Dark-mode-first infrastructure UX.
- Minimal but premium card density.
- Subtle glow and restrained motion.
- No crypto-neon or gaming-style UI.

## Component Patterns Introduced
- `OsPageTemplate` for shared heading + metric cards.
- `SatelinkOsShell` for stable route nav and keyboard hints.
- `DeploymentTerminal` for infra-grade log viewing.
- `RuntimeStatusBar` for persistent operational telemetry.
- `ActivityStream` for realtime event awareness.
- `DeploymentLifecycleTimeline` for phased deployment clarity.

## Tokens
- Source: `apps/web/src/lib/design-tokens.ts`
- Centralized scales:
  - spacing
  - radius
  - shadows + glow
  - motion duration
  - z-index layers

## Motion Guidance
- Framer Motion pulses used for network/globe signaling.
- Topology updates avoid heavy transitions to preserve clarity.
- Realtime change feedback is semantic (color/status/text first).

## Accessibility Notes
- Keyboard navigation supported for route jumps.
- Mobile nav toggle for narrow screens.
- Text contrast maintained on dark surfaces with desaturated accents.

## Known Design Gaps
- Token adoption is partial; more legacy components still use inline values.
- Need formal empty state illustration set for OS routes.
