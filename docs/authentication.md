# Satelink Authentication System

## Overview

Satelink uses a **wallet-based authentication system** (EIP-191 signature verification) with JWT access + refresh token pairs. All auth logic is centralized in `apps/api/src/auth/`.

## Module Structure

```
apps/api/src/auth/
├── jwt_service.js       — Token signing/verification (no fallback secrets)
├── wallet_auth.js       — EIP-191 nonce generation + signature verification
├── session_manager.js   — Post-verification: user upsert, token issuance, device tracking
├── role_service.js      — Role definitions, permission mapping, dashboard routing
├── auth_controller.js   — Express route handlers (challenge/verify/me/refresh/logout)
└── auth_middleware.js   — Express middleware (requireJWT, requireRole, optionalAuth)
```

## Authentication Flow

### 1. Challenge (POST /auth/challenge)

Client requests a nonce to sign.

**Request:**
```json
{ "address": "0x1234..." }
```

**Response:**
```json
{
  "ok": true,
  "nonce": "abc123...",
  "message": "Welcome to Satelink!\n\nSign this nonce to authenticate: abc123...\n\nAddress: 0x1234...",
  "expires_at": 1710700000000
}
```

**Security:**
- Rate limited: 20 requests / 15 minutes per IP
- Nonce stored in `auth_nonces` DB table with 5-minute TTL
- Nonce is single-use (deleted after verification)

### 2. Verify (POST /auth/verify)

Client submits wallet signature for verification.

**Request:**
```json
{
  "address": "0x1234...",
  "signature": "0xabcd...",
  "message": "Welcome to Satelink!..."
}
```

**Response:**
```json
{
  "ok": true,
  "token": "<access_jwt>",
  "refreshToken": "<refresh_jwt>",
  "expiresIn": "15m",
  "user": { "wallet": "0x1234...", "role": "user" },
  "dashboardRoute": "/"
}
```

**Security:**
- EIP-191 signature recovery via ethers.js
- Recovered address must match stored nonce address
- Nonce invalidated immediately after use
- User upserted in `users` table
- Device fingerprint recorded in `trusted_devices`
- httpOnly session cookie set alongside JSON response

### 3. Me (GET /auth/me)

Returns current user info from JWT.

**Headers:** `Authorization: Bearer <token>` or `Cookie: satelink_session=<token>`

**Response:**
```json
{
  "ok": true,
  "user": {
    "wallet": "0x1234...",
    "role": "node_operator",
    "permissions": ["view_dashboard", "view_node_stats", "claim_rewards"],
    "sessionId": "uuid",
    "iat": 1710700000,
    "exp": 1710700900
  }
}
```

### 4. Refresh (POST /auth/refresh)

Rotate access token using refresh token.

**Request:**
```json
{ "refreshToken": "<refresh_jwt>" }
```

**Response:**
```json
{
  "ok": true,
  "accessToken": "<new_access_jwt>",
  "refreshToken": "<new_refresh_jwt>",
  "expiresIn": "15m"
}
```

### 5. Logout (POST /auth/logout)

Clears session cookie.

## JWT Structure

### Access Token
```json
{
  "userId": "uuid",
  "wallet": "0x...",
  "role": "node_operator",
  "permissions": ["view_dashboard", "view_node_stats", "claim_rewards"],
  "sessionId": "uuid",
  "jti": "unique-token-id",
  "type": "access",
  "iss": "satelink-network",
  "exp": 1710700900,
  "iat": 1710700000
}
```

### Refresh Token
```json
{
  "userId": "uuid",
  "role": "node_operator",
  "wallet": "0x...",
  "jti": "unique-token-id",
  "type": "refresh",
  "iss": "satelink-network"
}
```

**Key properties:**
- Access token TTL: 15 minutes (configurable via `JWT_TTL`)
- Refresh token TTL: 7 days (configurable via `JWT_REFRESH_TTL`)
- Algorithm: HS256 (locked, no algorithm confusion attacks)
- Separate secrets: `JWT_SECRET` for access, `JWT_REFRESH_SECRET` for refresh
- JTI included on all tokens for future revocation support

## Middleware Usage

### requireJWT
```javascript
import { requireJWT } from '../auth/auth_middleware.js';

router.get('/protected', requireJWT, (req, res) => {
    // req.user is available with decoded JWT + permissions
    res.json({ wallet: req.user.wallet });
});
```

### requireRole
```javascript
import { requireJWT, requireRole } from '../auth/auth_middleware.js';

router.get('/admin-only', requireJWT, requireRole(['admin_super', 'admin_ops']), handler);
router.get('/builder-only', requireJWT, requireRole('builder'), handler);
```

### Shorthand Middleware Arrays
```javascript
import { requireAdmin, requireBuilder, requireNode } from '../auth/auth_middleware.js';

router.get('/admin', ...requireAdmin, handler);
router.get('/builder', ...requireBuilder, handler);
router.get('/node', ...requireNode, handler);
```

### optionalAuth
```javascript
import { optionalAuth } from '../auth/auth_middleware.js';

router.get('/public', optionalAuth, (req, res) => {
    if (req.user) {
        // Show extra data for authenticated users
    }
});
```

## Backward Compatibility

The following legacy endpoints are preserved:
- `POST /auth/nonce` → redirects to `/auth/challenge`
- `POST /auth/start` → redirects to `/auth/challenge`
- `POST /auth/finish` → redirects to `/auth/verify`
- `POST /auth/embedded/start` → legacy embedded auth (still mounted)
- `POST /auth/embedded/finish` → legacy embedded auth (still mounted)
- `POST /auth/builder/challenge` → builder-specific auth (separate HMAC session)

## Security Requirements

| Secret | Required | Min Length | Fallback |
|--------|----------|-----------|----------|
| JWT_SECRET | Yes | 64 chars | NONE — process exits |
| JWT_REFRESH_SECRET | Yes | 32 chars | NONE — process exits |
| ADMIN_API_KEY | Yes (prod) | 16 chars | NONE — 500 returned |
| IP_HASH_SALT | Yes | any | NONE — process exits |

## Database Tables

### auth_nonces
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| address | TEXT | Wallet address (lowercase) |
| nonce | TEXT | Random 16-byte hex |
| created_at | INTEGER | Unix timestamp ms |
| expires_at | INTEGER | Unix timestamp ms (5 min TTL) |
| used_at | INTEGER | Timestamp when consumed (NULL = unused) |

### users
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| primary_wallet | TEXT | Wallet address (lowercase) |
| role | TEXT | User role (see Role Service) |
| status | TEXT | active, flagged, suspended |
| created_at | INTEGER | Unix timestamp ms |
| last_login_at | INTEGER | Unix timestamp ms |

### trusted_devices
| Column | Type | Description |
|--------|------|-------------|
| wallet | TEXT | Wallet address |
| device_public_id | TEXT | Device identifier |
| user_agent | TEXT | Browser user agent |
| ip_hash | TEXT | Hashed IP address |
| first_seen_at | INTEGER | Unix timestamp ms |
| last_seen_at | INTEGER | Unix timestamp ms |
| status | TEXT | active, revoked |
