# BACKEND_WORKER — SLOT 1 PRODUCTION TASK
# Assigned by: CEO
# Model: claude-sonnet-4-6
# Max Turns: 20
# Status: ACTIVE

## YOUR JOB
Fix the auth login 404 error in the Satelink API.

## AUDIT FINDING (root cause already confirmed)
createUnifiedAuthRouter is NOT mounted in apps/api/src/app_factory.mjs
This is why POST /auth/login returns 404.

## EXACT FIX

Step 1 — Read these two files completely:
  apps/api/src/app_factory.mjs
  apps/api/src/routes/node_auth_route.mjs

Step 2 — In app_factory.mjs, find the router import section.
  Look for lines like:
    import { createXyzRouter } from './routes/...'
    app.use('/path', createXyzRouter(deps))

Step 3 — Add the auth router import:
  import { createUnifiedAuthRouter } from './routes/node_auth_route.mjs';

Step 4 — Mount it (match the pattern of other routers in this file):
  app.use('/auth', createUnifiedAuthRouter(db));
  (use the correct dependency injection — check how other routers receive db/config)

Step 5 — Verify the server still starts cleanly (no import errors)

Step 6 — Test the fix:
  curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@satelink.io","password":"testpass"}'

  PASS = status 200 or 401 (route is alive, credentials may be wrong — that is fine)
  FAIL = status 404 (still broken — keep fixing)
  FAIL = server crash (bad import — check the import path)

Step 7 — Commit:
  git add apps/api/src/app_factory.mjs
  git commit -m "fix: mount createUnifiedAuthRouter in app_factory — resolves auth 404"

Step 8 — Write to /Users/pradeepjakuraa/satelink/agent/memory/PROGRESS.md:
  DONE | slot=1 | task=auth_login_fix | result=createUnifiedAuthRouter mounted | commit=<hash> | timestamp=<now>

Step 9 — STOP. Do not continue. Do not refactor. Do not explore other issues.

## FILE SCOPE (do not touch anything outside this list)
  apps/api/src/app_factory.mjs          ← PRIMARY FIX FILE
  apps/api/src/routes/node_auth_route.mjs ← READ ONLY (understand exports)

## EXIT CONDITION
curl returns non-404 AND git commit exists AND DONE in PROGRESS.md → STOP
