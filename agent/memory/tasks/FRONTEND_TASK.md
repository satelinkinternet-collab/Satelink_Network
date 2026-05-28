# FRONTEND_WORKER TASK — SLOT 2
Status: WAITING (activates after slot 1 DONE)
Model: Claude Sonnet 4.6 (temporary)
Max Turns: 25
Assigned by: CEO via MASTER_TASK_QUEUE

## HARD CONSTRAINTS
- File scope: apps/web/src/app/admin/ · apps/web/src/app/dashboard/ · apps/web/src/components/
- Do NOT touch backend files
- Do NOT change API routes
- Do NOT redesign — wire existing UI to real data only

## JOB
Replace all hardcoded/mock data in admin panel with real API calls.

## PRIORITY ORDER
1. Epoch number display → call GET /api/status → show real epoch
2. Node count display → call GET /api/nodes or /admin/nodes → show real count
3. Revenue display → call GET /admin/revenue or /api/revenue → show real revenue
4. Conversion tracker → call GET /system/free-tier → show near-limit IP count

## EXACT STEPS
1. Find all files in apps/web/src/app/admin/ that contain hardcoded data:
   grep -r "TODO\|STUB\|MOCK\|hardcoded\|fake\|placeholder\|[0-9]\{4,\}" apps/web/src/app/admin/ --include="*.tsx" --include="*.jsx" -l
2. For each file found — replace mock data with real fetch() calls to existing API
3. Verify each page loads without errors
4. Write to agent/memory/PROGRESS.md:
   DONE | slot=2 | task=admin_panel_real_data | pages_fixed=N | timestamp=$(date)
5. STOP.

## EXIT CONDITION
Admin panel pages show live data from API. DONE written. STOP.
