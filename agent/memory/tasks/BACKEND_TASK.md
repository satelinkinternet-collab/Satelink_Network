# BACKEND_WORKER TASK — SLOT 1
Status: ACTIVE
Model: Claude Sonnet 4.6 (temporary — will change when plan upgrades)
Max Turns: 20
Assigned by: CEO

## HARD CONSTRAINTS
- File scope: apps/api/app_factory.mjs · apps/api/src/routes/ · apps/api/src/gateway/routes/auth_v2.js
- You may NOT touch any other files
- You have 20 turns maximum
- STOP immediately when DONE is written

## JOB
Fix auth login 404.

## ROOT CAUSE (from audit)
The `createUnifiedAuthRouter` from `auth_v2.js` is NOT mounted in `app_factory.mjs`.
It's only mounted in legacy files (`src/core/routes.js`, `src/gateway/routes.js`) which are not used by Railway.

## EXACT STEPS
1. Read: apps/api/src/gateway/routes/auth_v2.js — understand the router
2. Read: apps/api/app_factory.mjs — find where to mount it
3. Add import at top of app_factory.mjs:
   import { createUnifiedAuthRouter } from "./src/gateway/routes/auth_v2.js";
4. Mount the router (after nodeAuthRouter mount, around line 195):
   app.use(createUnifiedAuthRouter({ db: pool }));
5. Test locally:
   curl -s -X POST http://localhost:3000/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"testpassword"}'
   PASS = JSON response (401 or 400 is fine, means route works)
   FAIL = 404 HTML (still broken, keep fixing)
6. Commit:
   git add apps/api/app_factory.mjs
   git commit -m "fix: mount auth_v2 router in app_factory for /login endpoint"
7. Write to agent/memory/PROGRESS.md:
   DONE | slot=1 | task=auth_login_fix | commit=<hash> | timestamp=$(date)
8. STOP. Do not explore further. Do not refactor. Do not improve other things.

## EXIT CONDITION
DONE is written in PROGRESS.md AND git commit exists. Then STOP.
