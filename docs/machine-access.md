---
title: "Machine access overview"
description: "Issue scoped, revocable tokens so AI agents, CI runners, and automation can observe runtime and trigger preview actions on Satelink Network."
---

# Machine access

Machine access lets you issue scoped tokens to AI agents, CI runners, and other automation so they can read runtime state and trigger preview actions on Satelink Network without using human credentials.

Use it when you want a machine to:

- Inspect deployments, metrics, logs, queues, or topology.
- Run diagnostics or build and deploy preview environments.
- Drive automation from a CLI or AI agent without sharing your dashboard login.

## How it works

Every machine token is:

- **Scoped** — limited to a fixed set of permissions (for example, `read:metrics`, `write:deployments`).
- **Environment- and project-aware** — only valid for the environments and projects you list when you issue it.
- **Hashed at rest** — Satelink stores only a hashed secret, so the raw token is shown exactly once at issuance.
- **Revocable and rotatable** — you can kill or replace a token at any time from the admin plane.
- **Audited** — every authenticated call is written to the machine audit log.

Mutating calls additionally require a replay-protected nonce via the `x-satelink-nonce` header.

Token format:

```text
slma.<environment>.<prefix>.<secret>
```

For the full storage and hashing model, see the [token security model](/docs/security/token-security-model).

## When to use it

| You want to… | Use machine access? |
|---|---|
| Let an AI agent read deployment logs | Yes — issue an `ai-agent-token` with `read:logs` |
| Trigger preview deploys from CI | Yes — issue a token with `write:deployments` |
| Restart a production service from automation | No — production writes are non-autonomous by default |
| Call public RPC endpoints | No — use a regular [API key](/docs/quick-start) |

## Quickstart

### 1. Issue a token (admin)

Admin endpoints are protected by the `x-satelink-admin-secret` header.

```bash
curl -X POST https://app.satelink.network/machine-access/v1/admin/tokens \
  -H "x-satelink-admin-secret: $SATELINK_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "identityName": "ci-preview-deployer",
    "machineType": "ci-runner",
    "tokenName": "GitHub Actions Preview Deployer",
    "tokenType": "ci-token",
    "scopes": ["read:runtime", "read:deployments", "write:deployments"],
    "environmentAccess": ["preview"],
    "projectAccess": ["apps/web"]
  }'
```

The response contains the raw token in the `token` field. **Save it now** — it is never returned again.

### 2. Use the token (machine)

Pass the token as a bearer credential on observability and action calls:

```bash
curl https://app.satelink.network/machine-access/v1/whoami \
  -H "Authorization: Bearer $SATELINK_MACHINE_TOKEN"
```

To trigger a preview deploy, include a unique nonce:

```bash
curl -X POST https://app.satelink.network/machine-access/v1/actions/deploy-preview \
  -H "Authorization: Bearer $SATELINK_MACHINE_TOKEN" \
  -H "x-satelink-nonce: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "preview",
    "projectId": "apps/web",
    "branch": "feature/new-landing",
    "commitSha": "abc123"
  }'
```

### 3. Rotate or revoke

```bash
# Rotate — old token dies, new raw token is returned once
curl -X POST https://app.satelink.network/machine-access/v1/admin/tokens/$TOKEN_ID/rotate \
  -H "x-satelink-admin-secret: $SATELINK_ADMIN_SECRET"

# Revoke — token cannot be used again
curl -X POST https://app.satelink.network/machine-access/v1/admin/tokens/$TOKEN_ID/revoke \
  -H "x-satelink-admin-secret: $SATELINK_ADMIN_SECRET"
```

## Token types and scopes

Common machine types:

- `ai-agent` — AI assistants (Claude, Cursor) with read-leaning scopes. AI tokens cannot call `restart-service`.
- `ci-runner` — CI/CD pipelines that build and deploy previews.
- `observability` — long-lived read-only tokens for dashboards and monitors.

Common scopes:

| Scope | Grants access to |
|---|---|
| `read:runtime` | Runtime overview and websocket session creation |
| `read:metrics` | Metrics endpoints |
| `read:deployments` | Deployment listings and status |
| `read:logs` | Log streams |
| `read:topology` | Service topology |
| `read:queues` | Queue depths and worker state |
| `write:deployments` | Trigger preview deploys |
| `write:builds` | Trigger preview builds |
| `write:services` | Restart services (not available to `ai-agent` tokens) |

Fetch the full catalog at runtime:

```bash
curl https://app.satelink.network/machine-access/v1/admin/permissions \
  -H "x-satelink-admin-secret: $SATELINK_ADMIN_SECRET"
```

## CLI

The `satelink-agent` CLI wraps the same endpoints:

```bash
satelink-agent inspect runtime --env preview --project control-plane
satelink-agent inspect logs --env staging --project apps/api
satelink-agent deploy preview --env preview --project apps/web
```

## Next steps

- [Machine access API reference](/docs/api/machine-access-api) — every endpoint, scope, and request shape.
- [Token security model](/docs/security/token-security-model) — hashing, replay protection, and audit guarantees.
