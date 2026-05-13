# Machine Access Architecture

## Goal
Provide a future-proof machine identity layer for Satelink OS without rewriting the existing API runtime.

## Runtime Shape
Satelink API remains Express-based. Machine Access is implemented as a modular control-plane package under:

`apps/api/src/machine-access`

The module is organized in a Nest-style service/provider shape so it can migrate cleanly later without forcing a framework rewrite today.

## Module Layout
- `contracts.js`
- `tables.js`
- `index.js`
- `auth.middleware.js`
- `token-hashing.service.js`
- `token.service.js`
- `permission-validator.service.js`
- `machine-identity.service.js`
- `environment-guard.service.js`
- `audit-logger.service.js`
- `rate-limiter.service.js`
- `replay-protection.service.js`
- `deployment-trigger.service.js`
- `observability-gateway.service.js`
- `websocket-auth.service.js`
- `redaction.js`

## Data Model
- `machine_access_identities`
  - machine identity registry
  - role bindings
  - default scopes
  - environment/project access
- `machine_access_tokens`
  - hashed token material
  - scope envelope
  - expiry and revocation state
  - rate-limit and IP restriction metadata
- `machine_access_audit_log`
  - immutable-style audit entries
  - chained hashes
- `machine_access_action_requests`
  - preview build/deploy/diagnostic/restart requests
  - approval state and scaffold execution status

## Request Flow
1. Machine calls `/machine-access/v1/*` with bearer token.
2. Token service parses prefix and validates the secret hash.
3. Environment guard checks environment, project, and optional IP restrictions.
4. Rate limiter enforces token-specific throughput.
5. Permission validator enforces route scopes.
6. Replay protection checks nonce for mutable routes.
7. Service handles readonly inspection or queues an action request.
8. Audit logger writes the event with chained hashes.

## Safe Agent Sandbox Flow
1. Admin issues `ai-agent-token`.
2. Token service constrains scopes and environments to the sandbox policy.
3. Agent inspects observability surfaces.
4. Agent may request preview build/deploy actions only.
5. Protected or destructive actions fail closed.
6. Human approval remains the production promotion boundary.

## Current Integration Points
- Mounted in `apps/api/app_factory.mjs` at `/machine-access/v1`
- Tables initialized in `apps/api/server.js`
- Internal admin UX scaffolded in `apps/web/src/app/internal/access`

## Future Extensions
- Redis-backed audit/event fan-out
- Executor adapters for Vercel, Railway, Cloudflare, and GitHub Actions
- Approval workflow service
- SSO-backed human admin surface
- Full websocket handshake enforcement
