---
title: "Machine Access API"
description: "Endpoint reference for the Satelink machine access control plane, observability plane, and action plane."
---

# Machine Access API

Base path: `/machine-access/v1`

For an introduction and quickstart, see [Machine access overview](/docs/machine-access).

## Admin Plane
Protected by `x-satelink-admin-secret`

### `GET /admin/permissions`
Returns:
- token types
- permission catalog
- safe agent sandbox policy

### `GET /admin/tokens`
Lists token records without exposing raw token secrets.

### `POST /admin/tokens`
Issues a token and returns the raw token exactly once.

Example body:
```json
{
  "identityName": "claude-runtime-auditor",
  "machineType": "ai-agent",
  "tokenName": "Claude Runtime Auditor",
  "tokenType": "ai-agent-token",
  "scopes": ["read:runtime", "read:deployments", "read:metrics", "read:logs"],
  "environmentAccess": ["preview"],
  "projectAccess": ["control-plane"]
}
```

### `POST /admin/tokens/:tokenId/revoke`
Revokes a token immediately.

### `POST /admin/tokens/:tokenId/rotate`
Revokes the old token and returns a replacement raw token once.

### `GET /admin/audit`
Filters:
- `environment`
- `projectId`
- `limit`

### `GET /admin/agents/policy`
Returns the safe agent sandbox policy and AI-agent identities.

## Machine Observability Plane
Protected by bearer token.

### `GET /whoami`
Returns resolved machine identity, scopes, environments, and projects.

### `GET /observability/overview`
Required scope:
- `read:runtime`

### `GET /observability/metrics`
Required scope:
- `read:metrics`

### `GET /observability/deployments`
Required scope:
- `read:deployments`

### `GET /observability/logs`
Required scope:
- `read:logs`

### `GET /observability/topology`
Required scope:
- `read:topology`

### `GET /observability/queues`
Required scope:
- `read:queues`

### `GET /observability/websocket`
Required scope:
- `read:runtime`

## Machine Action Plane
Protected by bearer token and `x-satelink-nonce`

### `POST /actions/deploy-preview`
Required scope:
- `write:deployments`

Example body:
```json
{
  "environment": "preview",
  "projectId": "apps/web",
  "branch": "feature/satelink-machine-access-layer",
  "commitSha": "abc123"
}
```

### `POST /actions/build-preview`
Required scope:
- `write:builds`

### `POST /actions/run-diagnostics`
Required scope:
- `read:runtime`

### `POST /actions/restart-service`
Required scope:
- `write:services`

Notes:
- service restarts are approval-gated
- AI agent tokens cannot call restart-service
- production writes remain non-autonomous by default

## Websocket Session Plane
### `POST /websocket/session`
Required scope:
- `read:runtime`

Returns a short-lived session token for future websocket handshake flows.

## CLI Direction
```bash
satelink-agent inspect runtime --env preview --project control-plane
satelink-agent inspect logs --env staging --project apps/api
satelink-agent deploy preview --env preview --project apps/web
```
