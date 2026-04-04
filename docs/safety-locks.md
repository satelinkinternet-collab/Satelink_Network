# Safety Locks & Guardrails

The Satelink node ecosystem operates strictly isolated sub-systems to prevent cross-contamination between `simulation` analytics and `live` Treasury deployments.

## 1. Live Guards & Endpoint Protections
When `SATELINK_MODE=live` is configured during initialization, the `src/middleware/liveGuard.js` router completely drops connection requests across strictly forbidden sandbox endpoints natively enforcing `403 Forbidden` JSON payloads.

Endpoints matching these patterns are instantly blocked:
- `/__test` (All destructive and mocking capabilities)
- `/dev` (All bypasses and developer overrides)
- `/seed` (Database hydration routines)
- `/simulation` (Strict simulation analytic views)

## 2. API Config Observability
A readonly endpoint `GET /api/config-snapshot` provides environment debugging for automated orchestrators and frontend panels.

**CRITICAL RULE:** It ONLY returns explicitly sanitized properties mapped sequentially with boolean indicators `isSet` representing presence. It **NEVER** outputs `.env` secrets, addresses, URLs, API Keys, or user permutations directly onto the stack trace. 

*For specific insight into what HTTP headers are strictly injected onto all outgoing requests referencing these boundaries, refer directly to the [API Surface Governance Documentation](api-surface-governance.md).*

Also refer to [Operator Flags & Readiness Gate](operator-flags.md) to manage safe-zone endpoint state dynamically.

## 3. Request Teletry (X-Request-ID)
To establish robust observability mapping between web requests and infrastructure, all requests landing on the `/api/*` namespaces intercept dynamic generation of `{crypto.randomUUID()}` locally.
- Injects native HTTP `X-Request-ID` headers to all responses.
- Injects a `requestId` property globally to all matching `.json()` bodies.
- A visual debugging script hooks onto `window.fetch` inside `SIMULATION` providing operators instant feedback. When booted `LIVE`, the interceptor completely evades browser DOM injection ensuring invisible tracing natively.
