# Satelink Rebuild — Build Log

## Purpose
Resumable build log. If execution stops, the next engineer resumes from the last completed step.

---

## Phase 1: Blueprint & Tracking (COMPLETE)
- [x] Created `docs/architecture_blueprint.md`
- [x] Created `docs/build_log.md` (this file)
- [x] Created `status.md`
- [x] Created `progress.md`

## Phase 2: Security Vulnerability Fixes (COMPLETE)
- [x] Fix JWT_REFRESH_SECRET fallback in auth_middleware.js
- [x] Fix HMAC fallback in builder_auth.js
- [x] Remove query-string token acceptance
- [x] Remove API key console.log
- [x] Add secure cookie flags
- [x] Move builder nonces to database
- [x] Add PASSWORD_SALT to validateEnv.js

## Phase 3: Auth System Unification (COMPLETE)
- [x] Create `apps/api/src/auth/` module directory
- [x] Create jwt_service.js
- [x] Create wallet_auth.js
- [x] Create session_manager.js
- [x] Create role_service.js
- [x] Create auth_controller.js
- [x] Create auth_middleware.js (unified)
- [x] Wire into routes.js

## Phase 4: EJS Legacy Archive (COMPLETE)
- [x] Create `/ui_garage/ejs_legacy/`
- [x] Move EJS templates
- [x] Verify no production routes reference EJS

## Phase 5: Dashboard Consolidation (COMPLETE)
- [x] Remove legacy `dashboard.js` (static JS)
- [x] Remove last `req.query.token` in `dashboard.js` (route handler)
- [x] Create Next.js middleware for server-side route protection
- [x] Expand AppShell auth guard to all dashboard routes
- [x] Create `RoleGuard` component for per-section access control
- [x] Create admin layout with role guard (admin_super, admin_ops, admin_readonly)
- [x] Create node layout with role guard (node_operator, admins)
- [x] Create builder layout with role guard (builder, admins)
- [x] Create distributor layout with role guard (distributor roles, admins)
- [x] Verify Next.js pages cover all roles (admin, node, builder, distributor, enterprise)
- [x] Create Agent Control Centre at `/admin/agent-control-centre` (10 platform agents)

## Phase 6: Documentation (COMPLETE)
- [x] docs/authentication.md
- [x] docs/dashboard_architecture.md
- [x] docs/security_model.md
- [x] docs/api_map.md
- [x] docs/rebuild_notes.md

## Phase 7: Validation (COMPLETE)
- [x] Query-token auth fully purged (only doc reference remains)
- [x] All dashboard routes protected by middleware + layout guards
- [x] Role routing verified in use-auth.tsx login()
- [x] Revenue pipeline untouched (protected modules not modified)
- [x] Withdraw pipeline untouched (protected modules not modified)
