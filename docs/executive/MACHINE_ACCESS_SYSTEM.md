# Satelink Machine Access

## Executive Summary
Satelink Machine Access is the internal machine identity and infrastructure authorization layer for Satelink OS. It is not a public API key product. It exists so trusted developers, CI/CD systems, internal automation, AI agents, observability tooling, and deployment workflows can inspect and operate Satelink infrastructure through a scoped, audited, revocable, environment-isolated control plane.

## Strategic Outcome
- Remove screenshot-and-terminal debugging from core operational workflows.
- Enable AI-assisted audits and diagnostics without exposing raw secrets.
- Allow preview deployment and build workflows to be triggered by trusted machines.
- Preserve human approval boundaries for protected production changes.

## What The Foundation Includes
- Hashed token storage with one-time raw token disclosure.
- Token classes for audit, observability, deployment, CI, AI agents, infra admin, temporary sessions, and project scope.
- Fine-grained permissions for logs, metrics, deployments, runtime, topology, queues, analytics, build actions, deployment actions, runtime/service controls, and admin operations.
- Environment and project isolation for every machine token.
- Replay-protected mutation requests.
- Immutable-style audit chaining for every machine action.
- Readonly observability endpoints plus scaffolded preview-action endpoints.
- Internal-only admin UX routes:
  - `/internal/access`
  - `/internal/access/tokens`
  - `/internal/access/audit`
  - `/internal/access/agents`

## Safe Agent Sandbox
AI agent access is intentionally useful but constrained.

Allowed:
- Inspect logs, metrics, runtime, deployments, topology, queues, analytics, and websocket health.
- Run diagnostics.
- Request preview builds and preview deployments in non-production environments.

Denied:
- Reading raw secrets.
- Restarting services.
- Writing runtime configuration.
- Mutating billing.
- Destructive or unrestricted production infrastructure control.

## Control Plane Surfaces
- Admin plane: `/machine-access/v1/admin/*`
- Machine observability plane: `/machine-access/v1/observability/*`
- Machine action plane: `/machine-access/v1/actions/*`
- Websocket session plane: `/machine-access/v1/websocket/session`

## Current Implementation Status
This pass establishes the foundation:
- architecture defined
- scopes defined
- audit model defined
- API boundaries defined
- backend scaffolding implemented in `apps/api/src/machine-access`
- internal admin UX scaffolded in `apps/web/src/app/internal/access`
- observability endpoints scaffolded

Still pending in future phases:
- executor integration for real deployment/build/restart systems
- approval workflow service
- IP CIDR restriction engine
- websocket gateway wiring
- secret-manager-backed admin flows

## Operational Rule
Machine Access is internal-only infrastructure. Any future change that makes it customer-facing, public by default, or non-audited violates the design intent of this system.
