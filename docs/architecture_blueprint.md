# Satelink Architecture Blueprint
## Pre-Auth Rebuild System Design Document

**Version:** 1.0
**Date:** March 17, 2026
**Branch:** claude/interesting-herschel
**Tag:** pre-auth-rebuild

---

## 1. System Layers

```
Layer 7 - UI/Dashboard    : Next.js 16 App Router (apps/dashboard/)
Layer 6 - API Gateway     : Express.js route orchestrator (src/gateway/routes.js)
Layer 5 - Auth Pipeline   : Unified auth (src/auth/) — wallet, email, API key
Layer 4 - Business Logic  : Operations engine, economics, scheduler
Layer 3 - Settlement      : Withdrawal service, adapters (EVM, NodeOps, Simulated)
Layer 2 - Data Layer      : UniversalDB (SQLite dev / PostgreSQL prod), 61+ tables
Layer 1 - Blockchain      : Fuse Network, Solidity contracts (Foundry)
```

## 2. Authentication Pipeline

### 2.1 Unified Auth Architecture

All auth flows converge into a single module at `apps/api/src/auth/`:

```
apps/api/src/auth/
  auth_controller.js    — Route handlers (challenge, verify, me, logout)
  wallet_auth.js        — EIP-191 signature verification + nonce management
  session_manager.js    — JWT issuance, refresh, revocation
  jwt_service.js        — Token signing/verification (no fallback secrets)
  role_service.js       — Role lookup, permission mapping
  auth_middleware.js    — Express middleware (requireJWT, requireRole)
```

### 2.2 Login Flow Diagram

```
                    +------------------+
                    |   Client App     |
                    |  (Next.js/API)   |
                    +--------+---------+
                             |
                    POST /auth/challenge
                    { wallet: "0x..." }
                             |
                             v
                    +------------------+
                    | auth_controller  |
                    |  .challenge()    |
                    +--------+---------+
                             |
                    wallet_auth.generateNonce()
                    Store in DB (5-min expiry)
                             |
                             v
                    { nonce, message_template, expires_at }
                             |
                    <-- Response to client -->
                             |
                    User signs message with wallet
                             |
                    POST /auth/verify
                    { wallet, signature, message }
                             |
                             v
                    +------------------+
                    | auth_controller  |
                    |    .verify()     |
                    +--------+---------+
                             |
                    wallet_auth.verifySignature()
                      - Recover address (EIP-191)
                      - Match against stored nonce
                      - Invalidate nonce (one-time use)
                             |
                    session_manager.createSession()
                      - Upsert user in DB
                      - Generate access + refresh tokens
                      - Record device fingerprint
                             |
                    role_service.getPermissions(user)
                             |
                             v
                    { token, refreshToken, user, role, permissions }
                             |
                    Set httpOnly cookie + return JSON
                             |
                    GET /auth/me (subsequent requests)
                      - Bearer token in Authorization header
                      - jwt_service.verify(token)
                      - Return user + permissions
```

### 2.3 JWT Payload Structure

```json
{
  "userId": "uuid",
  "wallet": "0x...",
  "role": "node_operator",
  "permissions": ["view_dashboard", "claim_rewards"],
  "sessionId": "uuid",
  "type": "access",
  "iss": "satelink-network",
  "exp": 1234567890,
  "iat": 1234567890,
  "jti": "unique-token-id"
}
```

### 2.4 Security Requirements

- JWT_SECRET: minimum 64 characters, NO fallback values
- JWT_REFRESH_SECRET: separate secret, NO fallback values
- Nonces: stored in `auth_nonces` table, 5-minute expiry, single-use
- Cookies: httpOnly=true, secure=true (prod), sameSite='strict'
- No query-string token acceptance
- No API key logging to console
- Token revocation via JTI stored in DB/Redis

## 3. Dashboard Routing

### 3.1 Canonical UI: Next.js (apps/dashboard/)

```
/login                    — Wallet connection + signature
/admin/command-center     — Admin command centre (real-time)
/admin/network/nodes      — Network fleet management
/admin/ops/*              — Operations monitoring
/admin/revenue/*          — Revenue analytics
/admin/rewards/*          — Epoch rewards
/admin/security/*         — Security & forensics
/admin/settings/*         — Feature flags, limits
/admin/diagnostics/*      — Self-tests, incidents
/run-node/dashboard       — Node operator earnings
/builder                  — Builder project management
/distributor              — Distributor portal
/enterprise               — Enterprise demand portal
/economics                — Economics/pricing
/network                  — Network stats
/settlement               — Settlement overview
```

### 3.2 Role-Based Dashboard Routing Priority

```
1. admin_super / admin_ops  → /admin/command-center
2. node_operator            → /run-node/dashboard
3. builder                  → /builder
4. distributor_lco/inf      → /distributor
5. enterprise               → /enterprise
```

### 3.3 Legacy UI (Archived)

EJS templates moved to `/ui_garage/ejs_legacy/` — not served in production.

## 4. API Architecture

### 4.1 Namespace Map

| Prefix | Purpose | Auth |
|--------|---------|------|
| `/auth/*` | Authentication (challenge/verify/me/logout) | None/JWT |
| `/api/admin/*` + `/admin/*` | Admin operations (72+ routes) | JWT + admin role |
| `/v1/node/*` | Node registration, heartbeat, jobs | Optional JWT |
| `/node-api/*` + `/api/node/*` | Node operator API | JWT + node role |
| `/builder-api/*` + `/api/builder/*` | Builder API | JWT + builder role |
| `/dist-api/*` | Distributor API | JWT + distributor role |
| `/ent-api/*` | Enterprise API | JWT + enterprise role |
| `/rpc/:chain` | RPC relay | API key |
| `/v1/ai/*` | AI inference | API key |
| `/v1/jobs/*` | Job automation | API key |
| `/marketplace/*` | Marketplace operations | Optional |
| `/health` | Health check | None |
| `/metrics` | Prometheus metrics | None |

## 5. Revenue Pipeline (PROTECTED)

```
API request
    |
    v
OperationsEngine.executeOp()     ← single entry point
    |                               validates, rate-limits, prices
    v
revenue_events_v2                 ← immutable ledger
    |
    v
finalizeEpoch()                   ← 50/30/20 split
    |
    v
epoch_earnings                    ← role-based distribution
    |
    v
claim() + withdraw()              ← ECDSA signature + rate limit
    |
    v
USDT settlement (on-chain)
```

**Protected files (DO NOT MODIFY):**
- `src/core/operations_engine.js`
- `src/economics/economic_ledger.js`
- `src/settlement/*`
- `src/nodes/*`
- `src/scheduler/*`
- `src/security/safe_mode_autopilot.js`
- `src/security/abuse_firewall.js`
- `contracts/*.sol`

## 6. Role Model

| Role | Permissions |
|------|-------------|
| `admin_super` | manage_system, manage_treasury, manage_ops, view_dashboard |
| `admin_ops` | manage_ops, view_dashboard |
| `admin_readonly` | view_dashboard |
| `node_operator` | view_node_stats, claim_rewards, view_dashboard |
| `builder` | manage_keys, view_usage, view_dashboard |
| `distributor_lco` | view_referrals, claim_commissions, view_dashboard |
| `distributor_influencer` | view_referrals, claim_commissions |
| `enterprise` | view_usage, view_invoices, view_dashboard |
| `user` | view_dashboard (default) |

## 7. Security Model

### 7.1 Defense Layers

1. **Env Validation** — validateEnv() exits process if secrets missing/weak
2. **Helmet + CSP** — Security headers on every response
3. **CORS** — Origin whitelist enforcement
4. **Rate Limiting** — Per-IP auth limits, per-wallet withdrawal limits
5. **Abuse Firewall** — Multi-metric rule engine (auth_fail, req, rl_hit, op_fail)
6. **Safe Mode Autopilot** — Auto-freeze on >50 errors/5min or P95 >2s
7. **JWT + Role Guards** — Per-route middleware enforcement
8. **Token Revocation** — JTI-based revocation store
9. **Withdrawal Guards** — Liquidity check, pause flag, security freeze

### 7.2 Secrets Management

| Secret | Required | Min Length | Fallback |
|--------|----------|-----------|----------|
| JWT_SECRET | Yes | 64 chars | NONE — process exits |
| JWT_REFRESH_SECRET | Yes | 32 chars | NONE — process exits |
| ADMIN_API_KEY | Yes (prod) | 16 chars | NONE — 500 returned |
| PASSWORD_SALT | Yes | any | NONE — process exits |
| IP_HASH_SALT | Yes | any | NONE — process exits |

## 8. Future Extensibility

- **Multi-chain support**: Settlement adapter pattern (EVM, Solana, etc.)
- **OAuth/SSO**: auth_controller.js designed for pluggable auth strategies
- **WebSocket dashboard**: StreamAPI already supports SSE, upgrade path to WS
- **Multi-tenant**: Enterprise API key isolation already in place
- **Mobile app**: API-first design, JWT works with any client
