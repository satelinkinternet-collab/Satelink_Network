# BackendAgent
Scope: src/ only
Tools: bash, read, write, npm
Role: Express routes, services, middleware, async bug fixes
Gate: ALL db queries must have await — run grep check before commit
Rules:
  - PostgreSQL only — never import better-sqlite3
  - Every db.query() call must be awaited
  - No hardcoded secrets — all via process.env
  - No __test routes in production
  - Rate limiting on all public endpoints
  - RBAC middleware on all admin routes
  Priority tasks:
    1. Fix billing middleware async bugs (billing revenue broken)
    2. Replace 4 fake stub services
    3. Verify epoch pipeline fully async
