# Satelink MVP

Satelink is a Decentralized Physical Infrastructure Network (DePIN) combining hardware nodes, an API builder platform, and decentralized settlement mechanisms to power the next generation of infrastructure.

## Architecture Highlights
- **Node Lifecycle Management**: Secure pair codes for zero-friction provisioning.
- **Heartbeat Integrity**: Hardened system with signature, nonce, and drift mitigation mechanisms to ensure node uptime credibility.
- **Operations Engine**: A paid usage pipeline tracking request usage securely.
- **Economic Ledger Engine**: Periodically finalizes epochs and distributes rewards accurately to honest operators.
- **Support & Triage**: Integrated diagnostic capabilities.
- **Security Mechanisms**: X-Admin-Keys, Spike Auto-Freeze, JWT-bounded session context, embedded authentication via wallets.

## Requirements
- Node.js v18+ (v24 recommended)
- SQLite (Local/Dev testing) or PostgreSQL (Production deployment)
- Active RPC for EVM settlement processing

## Initial Setup & Boot

### 1. Clone & Install
```bash
git clone https://github.com/satelinkinternet-collab/satelink-mvp.git
cd satelink-mvp
npm install
```

### 2. Configure Environment Secrets
Satelink strictly enforces secret configurations in production.
Create an `.env` file at the root:

```env
# Server
PORT=8080
NODE_ENV=development

# Authentication & Encryption Salts
JWT_SECRET=your_super_secret_jwt_string_needs_to_be_long
IP_HASH_SALT=another_long_random_salt_for_ips
IP_SALT=another_long_random_salt_for_ips

# Database Configuration
# Dev uses SQLite by default:
SQLITE_PATH=satelink.db
# Prod uses Postgres (SQLite will hard-fail in Production):
# DATABASE_URL=postgres://user:pass@host:5432/db

# Keys
ADMIN_API_KEY=your_secure_admin_key_here
```

### 3. Running Locally
Run the Node.js server to start processing requests:
```bash
npm start
```
*Note: SQLite migrations are automatically applied on boot.*

## Testing & Verification
Satelink is verified via integration scripts:
```bash
# General tests
npm test

# Automated Go-Live Smoke Test
./antigravity_test.sh
```

## Production Guidelines
- **NEVER** run `DB_TYPE=sqlite` or rely on `satelink.db` in production.
- **DO NOT** use default fallback secrets (`dev_only_secret`, `satelink_salty`, etc.).
- Refer to `docker-compose.postgres.yml` for containerized production environments.
