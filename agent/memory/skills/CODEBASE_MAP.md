# SATELINK CODEBASE NAVIGATION MAP
# Use this to find any file before starting any task.

---

## BACKEND — apps/api/

Entry point:          apps/api/server.js (or server.mjs)
App factory:          apps/api/src/app_factory.mjs  ← CRITICAL: route mounting here
Auth routes:          apps/api/src/routes/node_auth_route.mjs  ← mounted at /api/auth
Node routes:          apps/api/src/routes/node_api.js
Admin routes:         apps/api/src/routes/admin_api.js
Revenue routes:       apps/api/src/routes/ (search for revenue/claim)

Epoch scheduler:      apps/api/src/scheduler/
Settlement:           apps/api/src/settlement/
Operations engine:    apps/api/src/services/operations-engine.js
Economic ledger:      apps/api/src/services/economic_ledger.js
Reputation engine:    apps/api/src/services/reputation_engine.js

Middleware:
  Auth:               apps/api/src/middleware/auth.js
  Rate limiting:      apps/api/src/middleware/ (search for rateLimit)
  Security:           apps/api/src/middleware/

Database:
  Migrations:         apps/api/src/db/migrations/ (25+ migrations, latest: 025_rpc_method_pricing.sql)
  Schema:             apps/api/src/db/schema.sql

Free tier gate:       search for FreeTierGate or free-tier in apps/api/src/
Credit system:        search for CreditGate or credit in apps/api/src/
Deposit listener:     search for DepositListener in apps/api/src/

---

## FRONTEND — apps/web/

Pages root:           apps/web/src/app/
Admin pages:          apps/web/src/app/admin/  ← 15 pages, some on mock data
Dashboard:            apps/web/src/app/dashboard/
Onboarding:           apps/web/src/app/onboarding/ (may not exist yet)
Components:           apps/web/src/components/

API integration:      search for fetch( or axios in apps/web/src/

---

## CONTRACTS — contracts/

Node registry:        contracts/NodeRegistryV2.sol
Revenue distributor:  contracts/RevenueDistributor.sol
Deployed address:     0x80AFEaC3B77CbeC1f7B9f24a50319DC72785DdA3 (Polygon mainnet)

---

## AGENT INTELLIGENCE — agent/memory/

Queue state:          agent/memory/PROGRESS.md           ← most important file
Task queue:           agent/memory/MASTER_TASK_QUEUE.md
Agent status:         agent/memory/AGENT_STATUS.md
Per-agent tasks:      agent/memory/tasks/[AGENT]_TASK.md
Skills (this dir):    agent/memory/skills/
Agent configs:        agent/memory/agents/[AGENT]/
Archive:              agent/memory/archive/

---

## DOCUMENTATION — docs/

Node operator guide:  docs/NODE_OPERATOR_GUIDE.md (commit f10b0fa)
Chainlist PR:         docs/chainlist_mainnet_pr.md  ← ready to submit (HUMAN needed)
dRPC submission:      docs/DRPC_SUBMISSION.md        ← ready to submit (HUMAN needed)
AEP protocol:         docs/AUTONOMOUS_ECONOMIC_PROTOCOL.md

---

## CONFIGURATION

Environment:          .env (never commit), .env.example (committed, no values)
Railway config:       railway.toml or railway.json
Docker:               Dockerfile, docker-compose.yml
CI pipeline:          .github/workflows/ci.yml (6 security gates)
Paperclip cloud:      Dockerfile.paperclip, start-cloud.sh, railway.paperclip.json

---

## HOW TO FIND ANYTHING

If looking for a service: grep -r "ServiceName" apps/api/src/services/ --include="*.js"
If looking for a route: grep -r "router\.(get|post|put)" apps/api/src/routes/ --include="*.js"
If looking for a DB table: grep -r "table_name" apps/api/src/db/ --include="*.sql"
If looking for an env var: grep -r "process.env" apps/api/src/ --include="*.js" | head -20
