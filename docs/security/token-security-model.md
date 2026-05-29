# Satelink Machine Access Token Security Model

## Core Rules
- Raw machine tokens are never stored.
- Tokens are generated from high-entropy random material.
- Token secrets are hashed with per-token salt using `scrypt`.
- Every token is scoped, revocable, expiring, environment-aware, and project-aware.
- Mutable requests require replay-protected nonces.
- All machine actions must enter the audit log.

## Token Format
Issued tokens use the internal format:

```text
slma.<environment>.<prefix>.<secret>
```

- `environment`: primary environment hint for the token.
- `prefix`: lookup identifier stored in the database.
- `secret`: one-time disclosed secret material, hashed before persistence.

Only the prefix, salt, hash, scopes, restrictions, and metadata are retained.

## Stored Fields
`machine_access_tokens`
- `token_prefix`
- `token_hash`
- `token_salt`
- `hash_algorithm`
- `scopes`
- `environment_access`
- `project_access`
- `rate_limit`
- `ip_restrictions`
- `expires_at`
- `revoked_at`
- `last_used_at`
- metadata and issuance context

## Revocation + Rotation
- Revocation sets `revoked_at` and blocks future authentication.
- Rotation revokes the previous token first, then issues a replacement token.
- Replacement raw tokens are returned once and must move directly into a secret manager.

## Replay Prevention
All mutable routes require `x-satelink-nonce`.
- Nonces are stored in Redis when available.
- In fallback mode they are tracked in memory with TTL.
- Reused nonces are rejected before the action request is accepted.

## Audit Enforcement
Every sensitive event writes:
- machine identity
- token ID
- scope
- environment
- project
- status
- IP address
- user agent
- execution metadata

Audit entries are chained with `prev_entry_hash` and `entry_hash` so tampering becomes detectable.

## AI Agent Security Policy
`ai-agent-token` is sandboxed:
- Allowed scopes: readonly inspection + `write:builds` + `write:deployments`
- Allowed environments: `local`, `development`, `preview`, `staging`
- Denied scopes: `write:configs`, `write:runtime`, `write:services`, `admin:*`
- Denied actions: production deploys, destructive runtime operations, secret access, billing mutation

## Environment Variables
Required for full secure operation:
- `MACHINE_ACCESS_ADMIN_SECRET`
- `MACHINE_ACCESS_SESSION_SECRET`

Existing platform-required variables still apply:
- `JWT_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `RPC_URL`
- `TREASURY_ADDRESS`
- `CHAIN_ID`

## Security Boundary Notes
- Admin token issuance is intentionally isolated behind a separate admin secret.
- Production-destructive execution is not enabled by default.
- Observability responses redact token-, secret-, cookie-, and authorization-like material before persistence or return.
