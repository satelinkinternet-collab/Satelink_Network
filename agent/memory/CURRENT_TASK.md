# CURRENT TASK

## Task
Wire production guard middleware (`src/middleware/prod_guard.js`) into `server.js` to block `/__test`, `/dev`, `/staging` routes when `NODE_ENV=production`.

## Status
DONE ✅ (2026-02-22)

## Context
- Server entry: `server.js` (Express 5, ESM)
- JWT_SECRET already enforced at boot (min 64 chars)
- Middleware mount point: early in the Express pipeline, before route handlers
- Guard must be a no-op in non-production environments

## Acceptance Criteria
- [x] `src/middleware/prod_guard.js` created
- [x] Imported and mounted in `server.js` before route handlers
- [x] Returns 403 in production for blocked paths
- [x] No effect in test/development environments
