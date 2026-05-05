# SATELINK NETWORK — Codex PROJECT BRAIN
# Read this file at the start of EVERY session before doing anything.
# Last updated: April 2026

## IDENTITY
Project: Satelink DePIN Network
Purpose: Decentralized infrastructure platform — monetize idle hardware (routers, servers, GPUs)
  by routing real workloads (RPC, AI inference, webhooks, automation, scraping, bandwidth proxy)
  with USDT settlement on Polygon Network.

## CORE ARCHITECTURAL IDENTITY
Satelink = Autonomous Economic Protocol (AEP)
NOT just a DePIN node network.
Primary revenue: machine-to-machine, zero human sales
9 protocol layers must ALL reach DONE for full product completion
Reference: docs/AUTONOMOUS_ECONOMIC_PROTOCOL.md

Anti-patterns (reject immediately if suggested):
- Human sales funnels
- Marketing campaigns
- Manual client onboarding
- Features that require human action to generate revenue

## RESUME PROTOCOL (CRITICAL — RUN EVERY SESSION)
1. Check if `agent/memory/CURRENT_TASK.md` exists → if yes, resume that task exactly
2. If not, read `agent/memory/PROGRESS.md` → find next PENDING task
3. Never start a new task without reading both files first
4. Never end a session without updating PROGRESS.md and clearing CURRENT_TASK.md

## NETWORK CONFIGURATION
Blockchain: Polygon Network (NOT Fuse — migration complete April 2026)
  - Testnet: Polygon Amoy (chainId: 80002)
  - Mainnet: Polygon PoS (chainId: 137)
  - RPC: https://rpc-amoy.polygon.technology (testnet)
  - Explorer: https://amoy.polygonscan.com
Settlement Token: USDT (ERC-20 on Polygon)
Economic Model: 50% node operators / 30% platform fee / 20% distribution pool

## TECH STACK
Backend: Node.js 20 + Express (port 8080) — monolith, evolve don't rebuild
Frontend: Next.js 14 + shadcn/ui (port 3000)
Database: PostgreSQL ONLY — zero SQLite anywhere
Cache/Queue: Redis 7
Smart Contracts: Solidity + Foundry + OpenZeppelin
Monorepo: single repo, modular services
CI/CD: GitHub Actions
Deploy: Docker + Vercel (frontend)

## REPO STRUCTURE (memorize this)
contracts/          Solidity + Foundry tests + deploy scripts
src/services/       Backend services (ops, reputation, settlement, SLA, pricing)
src/routes/         Express route handlers
src/middleware/     Auth, rate limiting, RBAC, error handling
src/config/         Environment, secrets, database config
src/agents/         Multi-agent orchestration framework
src/sentinel/       Self-healing revenue sentinel (5 modules, runs every 60s)
src/jobs/           Scheduled jobs (epoch pipeline, treasury monitor)
web/src/app/        Next.js pages by role/feature
scripts/            Deployment, security gate, CI tools
scripts/security/   6 blocking security gate scripts
test/               Backend tests, contract tests, E2E
docs/               Architecture, API, deployment documentation
agent/memory/       Persistent agent state (NEVER delete these files)
.Codex/            Codex config (gitignored)

## CORE RULES — NEVER VIOLATE
1. EVOLVE DON'T REBUILD — add modules, never rewrite working systems
2. ALL DB CALLS MUST USE await — the async/sync PostgreSQL bug is the #1 silent killer
3. NO HARDCODED SECRETS — every secret via process.env, hard-fail if missing
4. NO SQLITE — anywhere, ever — PostgreSQL only
5. NO FAKE STUBS — 4 stub services exist, replace them when you touch their files
6. NO DIRECT PUSH TO main — always feature branch → PR → develop → main
7. COMMIT AFTER EVERY TASK — format: `feat(S0-001): description`
8. SECURITY AGENT HAS VETO — if SecurityAgent returns FAIL, nothing deploys

## ACTIVE P0 ISSUES (fix these before anything else)
- 9 async/sync bugs: billing middleware has ZERO await calls (revenue broken)
- 5 security vulnerabilities: see docs/audit-p0-findings.md
- 4 fake stub services: need real implementations
- 35 unmanaged branches: consolidate to main/develop/feature/hotfix/release
- 733 duplicate OZ files in utils/lib/ (remove after confirming submodule works)

## CURRENT STAGE
Stage: S0 (Production Blockers + Security Foundation)
Progress: 6/121 tasks complete (5%)
Revenue Readiness: 28% | Production: 25% | Launch: 20%
Active milestone: Git rescue + async bug fixes + billing middleware repair
Target mainnet: September–October 2026 (Stage S9)

## BRANCH NAMING
feature/S0-007-billing-async-fix
hotfix/billing-middleware-null-await
release/v0.1.0-security-foundation
Never commit directly to main or develop.

## COMMIT FORMAT
feat(TASK-ID): short description
fix(TASK-ID): what was broken and how fixed
chore(TASK-ID): maintenance, cleanup
test(TASK-ID): test additions
docs(TASK-ID): documentation only

## MCP SERVERS IN USE
- GitHub: branch management, PR, CI status
- Google Drive: architecture PDFs, execution plans
- Vercel: frontend deploy, env vars
- Cloudflare: DNS, Workers
- Slack: dev alerts, CI notifications
- Context7: live Node.js/Solidity/Next.js docs
- Discord: node operator community alerts

## ENVIRONMENT VARIABLE POLICY
Required vars (hard-fail if missing):
  JWT_SECRET (min 64 chars)
  DATABASE_URL (PostgreSQL connection string)
  REDIS_URL
  RPC_URL (Polygon)
  TREASURY_ADDRESS
  CHAIN_ID
Optional vars (warn if missing):
  DISCORD_WEBHOOK_URL
  SLACK_WEBHOOK_URL
  POLYGONSCAN_API_KEY

## DEFINITION OF DONE (per task)
- [ ] Code written and follows module pattern
- [ ] All DB queries use await
- [ ] No hardcoded secrets
- [ ] Tests written (unit + integration)
- [ ] PROGRESS.md updated
- [ ] Committed to feature branch
- [ ] CI passes
