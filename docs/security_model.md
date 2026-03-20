# Satelink Security Model

## Defense Layers

### Layer 1: Environment Validation
- `validateEnv()` runs at module load time
- Process exits if required secrets are missing or too short
- No fallback values for any secret — eliminates "dev-only" backdoors

### Layer 2: Helmet + CSP
- Security headers on every response
- Content-Security-Policy prevents XSS

### Layer 3: CORS
- Origin whitelist enforcement
- Credentials allowed only for whitelisted origins

### Layer 4: Rate Limiting
- **Auth endpoints:** 20 req / 15 min per IP (express-rate-limit)
- **Withdrawal endpoints:** Per-wallet daily limits
- **General API:** Configurable per-route limits

### Layer 5: Abuse Firewall
- Multi-metric rule engine tracking:
  - `auth_fail` — failed authentication attempts
  - `req` — total requests per IP
  - `rl_hit` — rate limit violations
  - `op_fail` — failed operations
- Auto-ban on threshold breach

### Layer 6: Safe Mode Autopilot
- Auto-freeze triggers:
  - >50 errors in 5 minutes
  - P95 response time >2 seconds
- Graceful degradation: non-critical endpoints disabled

### Layer 7: JWT + Role Guards
- Per-route middleware enforcement
- Separate `requireJWT` and `requireRole` middleware
- 9 roles with granular permission mapping
- No dev bypass in any environment

### Layer 8: Token Revocation (Planned)
- JTI (JWT Token ID) included on all tokens
- Revocation store via Redis (TODO)
- Currently mitigated by short access token TTL (15 min)

### Layer 9: Withdrawal Guards
- Liquidity check before processing
- Pause flag for emergency freeze
- Security freeze on anomaly detection
- ECDSA signature verification for on-chain settlement

## Secret Management

| Secret | Purpose | Min Length | Fallback |
|--------|---------|-----------|----------|
| `JWT_SECRET` | Access token signing | 64 chars | NONE — process exits |
| `JWT_REFRESH_SECRET` | Refresh token signing | 32 chars | NONE — process exits |
| `ADMIN_API_KEY` | Builder session HMAC, admin API auth | 16 chars | NONE — 500 error |
| `PASSWORD_SALT` | Password hashing | any | NONE — process exits |
| `IP_HASH_SALT` | IP address hashing for rate limiting | any | NONE — process exits |

## Security Fixes Applied (This Rebuild)

### CRITICAL: HMAC Secret Conflation
- **Before:** `process.env.ADMIN_API_KEY || process.env.JWT_SECRET`
- **After:** Dedicated `getSessionHmacKey()` that requires ADMIN_API_KEY exclusively
- **Impact:** Prevents JWT_SECRET compromise from escalating to builder session forgery

### HIGH: Query-String Token Acceptance
- **Before:** `req.query.token` accepted as auth source
- **After:** Removed entirely — tokens only from Authorization header or httpOnly cookies
- **Impact:** Prevents token leakage via browser history, referrer headers, proxy logs

### HIGH: In-Memory Nonce Storage
- **Before:** Builder nonces stored in `Map()` (lost on restart)
- **After:** Persisted to `auth_nonces` DB table with 5-minute TTL
- **Impact:** Prevents nonce replay after server restart

### MEDIUM: IP Hash Salt Fallback
- **Before:** `process.env.IP_HASH_SALT || ''` (empty string fallback)
- **After:** No fallback — `validateEnv()` ensures presence
- **Impact:** Prevents IP tracking evasion via predictable hashing

## Cookie Security

All session cookies use:
```
httpOnly: true          — No JavaScript access (XSS protection)
secure: true (prod)     — HTTPS only in production
sameSite: 'strict'      — No cross-origin requests (CSRF protection)
maxAge: <configured>    — Automatic expiry
```

## Protected Modules (DO NOT MODIFY)

These files are frozen during the auth rebuild:
- `src/core/operations_engine.js` — Revenue entry point
- `src/economics/economic_ledger.js` — Immutable ledger
- `src/settlement/*` — Withdrawal pipeline
- `src/nodes/*` — Node registration
- `src/scheduler/*` — Job scheduling
- `src/security/safe_mode_autopilot.js` — Auto-freeze
- `src/security/abuse_firewall.js` — Rate limiting
- `contracts/*.sol` — Smart contracts
