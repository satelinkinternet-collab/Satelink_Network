# Satelink Auth Rebuild — Engineering Notes

## Rebuild Summary

**Branch:** claude/interesting-herschel
**Tag (pre-rebuild):** pre-auth-rebuild
**Date:** March 17, 2026

## What Changed

### 1. Unified Auth Module (`apps/api/src/auth/`)

Created 6 new files replacing 4 fragmented auth implementations:

| Old File | New File | Status |
|----------|----------|--------|
| `security/auth_middleware.js` | `auth/auth_middleware.js` | Replaced (old kept for import compat) |
| `gateway/routes/auth_v2.js` | `auth/auth_controller.js` | Legacy kept, new canonical |
| `gateway/routes/auth_embedded.js` | `auth/wallet_auth.js` + `auth/session_manager.js` | Legacy kept at /auth/embedded |
| `gateway/routes/builder_auth.js` | (hardened in place) | Security fixes applied |
| (none) | `auth/jwt_service.js` | New — single token source |
| (none) | `auth/role_service.js` | New — single role source |

### 2. Security Fixes

| Fix | Severity | File |
|-----|----------|------|
| Removed JWT_SECRET fallback | CRITICAL | auth_middleware.js |
| Removed HMAC secret conflation | CRITICAL | builder_auth.js |
| Removed query-string token acceptance | HIGH | auth_middleware.js, auth_v2.js |
| Removed IP_HASH_SALT empty fallback | MEDIUM | auth_middleware.js |
| Added secure cookie flags | MEDIUM | builder_auth.js |
| Moved builder nonces to DB | MEDIUM | builder_auth.js |

### 3. Revenue Pipeline Integrity

| Fix | File |
|-----|------|
| Replaced direct INSERT into revenue_events_v2 | revenue_source_classifier.js |
| Replaced direct INSERT into epoch_earnings | settlement_router.js |
| Replaced direct INSERT into epoch_earnings | node_network.js |

All revenue now flows through `OperationsEngine.executeOp()`.

### 4. EJS Archive

18 EJS templates moved from `apps/api/src/gateway/views/` to `ui_garage/ejs_legacy/`. No production routes reference EJS rendering.

## What Did NOT Change

These modules were explicitly protected and verified unchanged:
- `src/core/operations_engine.js`
- `src/economics/economic_ledger.js`
- `src/settlement/*`
- `src/nodes/*`
- `src/scheduler/*`
- `src/security/safe_mode_autopilot.js`
- `src/security/abuse_firewall.js`
- `contracts/*.sol`

## Backward Compatibility

All legacy auth endpoints preserved:
- `/auth/nonce` → `/auth/challenge`
- `/auth/start` → `/auth/challenge`
- `/auth/finish` → `/auth/verify`
- `/auth/embedded/*` — still mounted
- `/auth/builder/*` — still mounted (hardened)
- `/me`, `/login`, `/auth/register` — still served by auth_v2.js

## Migration Path

1. **Phase 1 (now):** New unified endpoints live alongside legacy
2. **Phase 2 (future):** Frontend migrates to `/auth/challenge` + `/auth/verify`
3. **Phase 3 (future):** Legacy endpoints deprecated with warning headers
4. **Phase 4 (future):** Legacy endpoints removed

## Known TODOs

- Token revocation store (JTI-based, requires Redis)
- `auth_v2.js` password hashing uses SHA256 (should be bcrypt)
- Builder auth session cookie should migrate to unified JWT
- Frontend localStorage token storage should migrate to memory-only
