# Satelink Dashboard Architecture

## Overview

The canonical UI is a **Next.js 16 App Router** application at `apps/dashboard/`. Legacy EJS templates have been archived to `ui_garage/ejs_legacy/` and are not served in production.

## Role-Based Dashboard Routing

After successful authentication, users are redirected to their role-appropriate dashboard:

| Priority | Role | Dashboard Route |
|----------|------|-----------------|
| 1 | `admin_super` | `/admin/command-center` |
| 2 | `admin_ops` | `/admin/command-center` |
| 3 | `admin_readonly` | `/admin/command-center` |
| 4 | `node_operator` | `/run-node/dashboard` |
| 5 | `builder` | `/builder` |
| 6 | `distributor_lco` | `/distributor` |
| 7 | `distributor_influencer` | `/distributor` |
| 8 | `enterprise` | `/enterprise` |
| 9 | `user` | `/` |

This mapping is defined in `apps/api/src/auth/role_service.js` via `getDashboardRoute(role)`.

## Page Structure

```
apps/dashboard/
├── /login                    — Wallet connection + signature
├── /admin/command-center     — Admin command centre (real-time)
├── /admin/network/nodes      — Network fleet management
├── /admin/ops/*              — Operations monitoring
├── /admin/revenue/*          — Revenue analytics
├── /admin/rewards/*          — Epoch rewards
├── /admin/security/*         — Security & forensics
├── /admin/settings/*         — Feature flags, limits
├── /admin/diagnostics/*      — Self-tests, incidents
├── /run-node/dashboard       — Node operator earnings
├── /builder                  — Builder project management
├── /distributor              — Distributor portal
├── /enterprise               — Enterprise demand portal
├── /economics                — Economics/pricing
├── /network                  — Network stats
└── /settlement               — Settlement overview
```

## Role Model

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

## Frontend Auth Flow

1. Client calls `POST /auth/challenge` with wallet address
2. Client signs the returned message with wallet
3. Client calls `POST /auth/verify` with signature
4. Server returns JWT + sets httpOnly cookie
5. Frontend stores token in memory (NOT localStorage)
6. Subsequent API calls use `Authorization: Bearer <token>` header
7. httpOnly cookie provides fallback for SSR/page reloads
8. Token refresh handled automatically before expiry

## Legacy UI Archive

EJS templates (18 files) archived to `ui_garage/ejs_legacy/`:
- Not served by any production route
- Preserved for reference only
- No EJS rendering engine loaded in production
