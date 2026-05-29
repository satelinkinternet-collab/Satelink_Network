# SATELINK COMPANY CONTEXT
# Every agent reads this before any task.
# Last updated: 2026-05-29

---

## WHAT SATELINK IS

Satelink is a DePIN (Decentralized Physical Infrastructure Network) that enables
developers and companies to run blockchain RPC infrastructure workloads on a
distributed network of node operators.

The platform earns revenue by charging per RPC call routed through the network.
Node operators earn USDT for contributing bandwidth and compute.
The platform takes a fee and distributes the rest to operators based on contribution.

In simple terms: Satelink is a decentralized RPC provider that pays node operators.

---

## PRODUCTION STATE (verified 2026-05-29)

Live URL: https://rpc.satelink.network
Network: Polygon PoS Mainnet (chainId: 137)
RevenueVault: 0x80AFEaC3B77CbeC1f7B9f24a50319DC72785DdA3
Current epoch: ~4757+ (autonomous, running)
Free tier: 1,611 IPs active, 354K+ calls tracked, 62 IPs near paid conversion
Uptime: 42+ hours confirmed
CI pipeline: GitHub Actions, 6 security gates active
Auth route: POST /api/auth/node-token — live (non-404 confirmed commit 9daffb9)

---

## BUSINESS MODEL

Revenue sources (in priority order):
1. RPC calls (current, live) — pay-per-call for Polygon RPC
2. MEV endpoint (next) — private transaction relay for DeFi bots
3. AI inference proxy (phase 3) — OpenAI-compatible endpoint, per-token billing
4. Bandwidth/scraping (phase 4) — residential IP routing
5. Bridge integrations (phase 5) — LayerZero, Wormhole health oracle

Revenue split per epoch:
- 50% → Node operators (distributed by contribution)
- 30% → Platform treasury
- 20% → Infrastructure reserve (capped at 6 months of costs)

Free tier: 500 calls/day per IP. Hit limit → upgrade to paid.
Paid tier: USDT deposit → credits → consumed per call.

---

## REVENUE TARGET

$500/hr autonomous machine-to-machine RPC revenue by June 30, 2026.
Path: Chainlist PR merge → organic M2M discovery → first paying users → MEV endpoint.

---

## TECHNOLOGY STACK

Backend: Node.js / Express (modular services)
Frontend: Next.js (421 TSX files, 35 page directories)
Database: PostgreSQL 16 only (Redis eliminated — in-memory Maps instead)
Blockchain: ethers v6, Polygon Mainnet
Contracts: Solidity, deployed on Polygon
CI/CD: GitHub Actions
Hosting: Railway (production)
Local: Mac + Paperclip + Gemini CLI + Claude Code

---

## CODEBASE STRUCTURE

/apps/api/          — backend Express API
  /src/routes/      — all API route handlers
  /src/services/    — business logic (epoch, revenue, settlement)
  /src/middleware/  — auth, rate limiting, security
  /src/scheduler/   — epoch scheduler, background jobs
  /src/settlement/  — Polygon settlement anchor
  server.js         — entry point
  app_factory.mjs   — route mounting and app setup

/apps/web/          — Next.js frontend
  /src/app/         — page components
  /src/app/admin/   — admin panel (15 pages, some still on mock data)
  /src/app/dashboard/ — operator dashboard

/contracts/         — Solidity smart contracts
  NodeRegistryV2.sol
  RevenueDistributor.sol

/docs/              — documentation
  chainlist_mainnet_pr.md  — ready to submit (HUMAN ACTION needed)
  DRPC_SUBMISSION.md       — ready to submit (HUMAN ACTION needed)
  NODE_OPERATOR_GUIDE.md   — written (commit f10b0fa)

/agent/memory/      — agent intelligence layer (this directory)
  PROGRESS.md       — rotational queue state
  MASTER_TASK_QUEUE.md — slot assignments
  tasks/            — per-agent task files
  skills/           — this directory (project intelligence)
  canonical/        — single source of truth files

---

## OPEN ISSUES (as of 2026-05-29)

P0 — Critical:
- Chainlist mainnet PR not submitted (docs ready, needs human GitHub action)
- 0 external nodes online (only internal node serving all traffic)
- USDT settlement path unconfirmed end-to-end

P1 — High:
- 15 admin panel pages showing mock/hardcoded data
- dRPC registration not submitted
- ~733 duplicate OpenZeppelin files in utils/lib/ (dead code)

---

## WHAT AGENTS MUST NEVER DO

- Touch the settlement engine without running VAL_ECONOMICS first
- Change epoch parameters without CEO approval
- Write to the contracts/ directory without CONTRACT review
- Delete any file without archiving it first
- Run with heartbeat ON (all heartbeats are OFF — rotational model only)
- Activate more than 1 worker simultaneously
- Create agents outside the approved 7-agent roster
