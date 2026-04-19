# SATELINK ECOSYSTEM SETUP — CLAUDE CODE EXECUTION PROMPT
# Version: 2.0 | Pre-Audit + Execute | April 2026
# Network: Polygon (Amoy testnet → Polygon mainnet)
# DB: PostgreSQL
# Paste this entire prompt into Claude Code terminal to execute.

---

You are the autonomous engineering team for the Satelink DePIN Network.
Before creating anything, AUDIT what already exists. Only create or upgrade what is needed.
Follow this exact sequence: AUDIT → FIX STALE → CREATE MISSING → VERIFY.

---

## PHASE 0: BOOTSTRAP AUDIT

Run the following checks and print a status table before doing anything else:

```bash
echo "=== SATELINK ECOSYSTEM AUDIT ==="
echo ""

# Check agent memory
echo "--- agent/memory/ ---"
for f in CURRENT_TASK.md PROGRESS.md DECISIONS.md BUG_LOG.md ROADMAP.md; do
  [ -f "agent/memory/$f" ] && echo "✅ agent/memory/$f" || echo "❌ MISSING: agent/memory/$f"
done

# Check .claude/
echo ""
echo "--- .claude/ ---"
for f in CLAUDE.md settings.json; do
  [ -f ".claude/$f" ] && echo "✅ .claude/$f" || echo "❌ MISSING: .claude/$f"
done
[ -d ".claude/commands" ] && echo "✅ .claude/commands/" || echo "❌ MISSING: .claude/commands/"
[ -d ".claude/subagents" ] && echo "✅ .claude/subagents/" || echo "❌ MISSING: .claude/subagents/"

# Check .vscode/
echo ""
echo "--- .vscode/ ---"
for f in tasks.json settings.json extensions.json; do
  [ -f ".vscode/$f" ] && echo "✅ .vscode/$f" || echo "❌ MISSING: .vscode/$f"
done

# Check scripts/
echo ""
echo "--- scripts/security/ ---"
for f in check-secrets.sh check-test-endpoints.sh check-sqlite.sh check-auth-middleware.sh check-hardcoded-keys.sh check-jwt-fallback.sh; do
  [ -f "scripts/security/$f" ] && echo "✅ scripts/security/$f" || echo "❌ MISSING: scripts/security/$f"
done
[ -f "scripts/smoke_test.sh" ] && echo "✅ scripts/smoke_test.sh" || echo "❌ MISSING: scripts/smoke_test.sh"
[ -f "scripts/rollback.sh" ] && echo "✅ scripts/rollback.sh" || echo "❌ MISSING: scripts/rollback.sh"

# Check CI
echo ""
echo "--- .github/workflows/ ---"
for f in satelink-ci.yml security-gate.yml notify.yml deploy-staging.yml; do
  [ -f ".github/workflows/$f" ] && echo "✅ .github/workflows/$f" || echo "❌ MISSING: .github/workflows/$f"
done

# Check stale Fuse references
echo ""
echo "--- Stale Fuse Network references ---"
grep -rl "fuse" --include="*.md" --include="*.yml" --include="*.js" --include="*.ts" --include="*.json" . \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -20

# Check SQLite in migrate.js
echo ""
echo "--- SQLite debt in migrate.js ---"
grep -n "better-sqlite3\|sqlite" scripts/migrate.js 2>/dev/null && echo "⚠️  SQLite still in migrate.js" || echo "✅ No SQLite in migrate.js"

# Check .env for Polygon
echo ""
echo "--- .env Polygon verification ---"
grep -i "polygon\|POLYGON\|RPC_URL\|CHAIN_ID" .env 2>/dev/null | sed 's/=.*/=<REDACTED>/' || echo "⚠️  No Polygon config found in .env"

echo ""
echo "=== AUDIT COMPLETE — PROCEEDING TO FIXES ==="
```

---

## PHASE 1: FIX STALE SETUP

### 1A — Upgrade migrate.js to PostgreSQL (remove better-sqlite3)

Replace `scripts/migrate.js` with a PostgreSQL-native migration runner:

```javascript
// scripts/migrate.js — PostgreSQL migration runner
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate(pool) {
  console.log('[MIGRATION] Starting PostgreSQL migration...');

  // Ensure migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const sqlDir = path.resolve(path.join(__dirname, '..', 'sql'));
  if (!fs.existsSync(sqlDir)) {
    console.log('[MIGRATION] No sql/ directory found — skipping.');
    return;
  }

  const files = fs.readdirSync(sqlDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT id FROM _migrations WHERE filename = $1', [file]
    );
    if (rows.length > 0) {
      console.log(`[MIGRATION] Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`[MIGRATION] Applying ${file}`);
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[MIGRATION] ✅ ${file} applied`);
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.warn(`[MIGRATION] ⚠️  ${file}: ${e.message} (continuing)`);
        await pool.query('INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      } else {
        console.error(`[MIGRATION] ❌ FATAL in ${file}: ${e.message}`);
        throw e;
      }
    }
  }
  console.log('[MIGRATION] ✅ Complete.');
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  migrate(pool)
    .then(() => pool.end())
    .catch(e => { console.error(e); process.exit(1); });
}
```

### 1B — Upgrade .env.staging.example (remove SQLite, add Polygon)

Rewrite `.env.staging.example`:

```bash
# ═══════════════════════════════════════════
# SATELINK NETWORK — STAGING ENVIRONMENT
# Network: Polygon (Amoy Testnet)
# DB: PostgreSQL
# ═══════════════════════════════════════════

# Server
NODE_ENV=staging
PORT=8080
HOST=0.0.0.0
SATELINK_MODE=sim

# Database — PostgreSQL ONLY (no SQLite)
DATABASE_URL=postgresql://satelink:password@localhost:5432/satelink_staging

# Cache
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=change_me_staging_must_be_64_chars_minimum_aaaaaaaaaaaaaaaaaaaaaa

# Blockchain — Polygon Amoy Testnet
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002
TREASURY_ADDRESS=0x0000000000000000000000000000000000000000
DEPLOYER_PK=
POLYGON_MUMBAI_RPC_URL=https://rpc-amoy.polygon.technology
POLYGONSCAN_API_KEY=

# USDT Contract — Polygon Amoy
USDT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Contract Addresses (populated after deploy)
NODE_REGISTRY_ADDRESS=
REVENUE_DISTRIBUTOR_ADDRESS=
CLAIMS_CONTRACT_ADDRESS=
SPLIT_ENGINE_ADDRESS=

# External APIs
NODEOPS_API_KEY=
MOONPAY_SECRET_KEY=

# Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1494267168991350915/y95hkw6acJOyaGZH0spUwAQ-wnMahY2NubgFoodBWRoTDAYa3HtOrvihpBqXejSlvR5p
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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

# Feature Flags
ENABLE_DRILLS=false
ENABLE_AUTO_EPOCH=false
```

### 1C — Rename and rewrite docs/DEPLOY_FUSE.md → docs/DEPLOY_POLYGON.md

Create `docs/DEPLOY_POLYGON.md` and delete (or rename) `docs/DEPLOY_FUSE.md`:

```markdown
# Deploying Satelink Contracts to Polygon Network

## Networks
- **Testnet:** Polygon Amoy (chainId: 80002)
- **Mainnet:** Polygon PoS (chainId: 137)

## Required GitHub Secrets
- `DEPLOYER_PK` — Deployer wallet private key (funded with MATIC for gas)
- `RPC_URL` — Polygon Amoy: `https://rpc-amoy.polygon.technology`
- `POLYGONSCAN_API_KEY` — For contract verification on Polygonscan
- `USDT_CONTRACT_ADDRESS` — USDT token on the target network

## Deploy Command
```bash
# Testnet (Amoy)
RPC_URL=https://rpc-amoy.polygon.technology node scripts/deploy-ethers.mjs

# Mainnet
RPC_URL=https://polygon-rpc.com node scripts/deploy-ethers.mjs
```

## Verify on Polygonscan
After deployment, verify with:
```bash
forge verify-contract <ADDRESS> NodeRegistryV2 \
  --chain polygon \
  --etherscan-api-key $POLYGONSCAN_API_KEY
```

## Environment Variables Required
See `.env.example` for full list. Key vars:
- `RPC_URL` — Polygon RPC endpoint
- `CHAIN_ID` — 80002 (Amoy) or 137 (Mainnet)
- `TREASURY_ADDRESS` — deployed vault address
- `USDT_CONTRACT_ADDRESS` — USDT ERC-20 on Polygon
```

### 1D — Fix agent-control-centre Fuse reference

Search and replace "Fuse adapter" → "Polygon adapter" in `public/agent-control-centre.html`:
```bash
sed -i 's/Fuse adapter/Polygon adapter/g; s/Fuse Network/Polygon Network/g; s/fuse\.io/polygon\.technology/g' public/agent-control-centre.html 2>/dev/null || true
```

### 1E — Upgrade .github/workflows/satelink-ci.yml with notifications + gitleaks

Append to the existing CI file — add these two jobs at the end of the jobs section:

```yaml
  # ═══════════════════════════════════════════
  # JOB: Secret Scanning (gitleaks)
  # ═══════════════════════════════════════════
  secret-scan:
    name: Secret Scan (gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  # ═══════════════════════════════════════════
  # JOB: Notify on failure
  # ═══════════════════════════════════════════
  notify-failure:
    name: Notify Failure
    runs-on: ubuntu-latest
    needs: [contracts, backend, secret-scan]
    if: failure()
    steps:
      - name: Discord Failure Alert
        run: |
          curl -s -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"❌ **Satelink CI FAILED** on branch \`${{ github.ref_name }}\` — commit \`${{ github.sha }}\` by ${{ github.actor }}. Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"}"
      - name: Slack Failure Alert
        run: |
          curl -s -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"❌ *Satelink CI FAILED* on branch \`${{ github.ref_name }}\` by ${{ github.actor }}. <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>\"}"
```

---

## PHASE 2: CREATE MISSING SETUP

### 2A — Create .claude/ directory structure

```bash
mkdir -p .claude/commands
mkdir -p .claude/subagents
```

### 2B — Create .claude/CLAUDE.md (Project Brain)

```markdown
# SATELINK NETWORK — CLAUDE CODE PROJECT BRAIN
# Read this file at the start of EVERY session before doing anything.
# Last updated: April 2026

## IDENTITY
Project: Satelink DePIN Network
Purpose: Decentralized infrastructure platform — monetize idle hardware (routers, servers, GPUs)
  by routing real workloads (RPC, AI inference, webhooks, automation, scraping, bandwidth proxy)
  with USDT settlement on Polygon Network.

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
.claude/            Claude Code config (gitignored)

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
```

### 2C — Create .claude/settings.json

```json
{
  "model": "claude-opus-4-5",
  "extendedThinking": true,
  "maxConcurrentSessions": 3,
  "allowedTools": [
    "bash",
    "read",
    "write",
    "edit",
    "grep",
    "glob",
    "mcp"
  ],
  "hooks": {
    "session_start": [
      "echo '=== SATELINK SESSION START ==='",
      "if [ -f agent/memory/CURRENT_TASK.md ]; then echo '📋 RESUMING TASK:'; cat agent/memory/CURRENT_TASK.md; else echo '📊 NO ACTIVE TASK — reading PROGRESS.md'; cat agent/memory/PROGRESS.md 2>/dev/null | tail -30; fi",
      "bash scripts/agent-env-check.sh 2>/dev/null || echo 'env-check script not found'",
      "docker ps --filter name=postgres --filter name=redis --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null || echo '⚠️  Docker not running'"
    ],
    "before_command": [
      "git status --short 2>/dev/null | head -5"
    ],
    "after_task_complete": [
      "npm test --if-present 2>&1 | tail -10",
      "git add -A && git diff --cached --stat"
    ],
    "session_end": [
      "echo '=== SESSION END — updating PROGRESS.md if needed ==='"
    ]
  },
  "permissions": {
    "allow": [
      "file_operations:read_write_within_repo",
      "bash:npm",
      "bash:forge",
      "bash:git",
      "bash:docker",
      "bash:node",
      "bash:curl",
      "bash:scripts/*"
    ],
    "deny": [
      "file_operations:delete:.env*",
      "file_operations:delete:contracts/",
      "bash:git push origin main",
      "bash:git push origin develop",
      "bash:rm -rf node_modules"
    ]
  },
  "autoApprove": false,
  "confirmBeforeWrite": false,
  "confirmBeforeDelete": true
}
```

### 2D — Create .claude/commands/ (7 slash commands)

**`.claude/commands/satelink-status.md`:**
```markdown
# /satelink-status
Reads PROGRESS.md and prints a formatted task dashboard.

Steps:
1. cat agent/memory/PROGRESS.md
2. Print count of DONE vs PENDING vs IN_PROGRESS tasks
3. Show current stage, revenue readiness %, production readiness %
4. Show the next 3 PENDING tasks
```

**`.claude/commands/satelink-resume.md`:**
```markdown
# /satelink-resume
Reads CURRENT_TASK.md and resumes exactly where the last session stopped.

Steps:
1. cat agent/memory/CURRENT_TASK.md — if missing, print "No active task. Use /satelink-status to find next task."
2. Read the exact resume state (file, function, line number if available)
3. Continue implementation from that exact point
4. Do not restart from scratch
```

**`.claude/commands/satelink-audit.md`:**
```markdown
# /satelink-audit
Runs all 6 security gate scripts and reports pass/fail.

Steps:
1. Run scripts/security/check-secrets.sh
2. Run scripts/security/check-test-endpoints.sh
3. Run scripts/security/check-sqlite.sh
4. Run scripts/security/check-auth-middleware.sh
5. Run scripts/security/check-hardcoded-keys.sh
6. Run scripts/security/check-jwt-fallback.sh
7. Print PASS/FAIL per check and overall result
8. If any FAIL: print exact file + line, do NOT proceed with deployment
```

**`.claude/commands/satelink-test.md`:**
```markdown
# /satelink-test
Runs all test suites and reports results.

Steps:
1. forge test -vv (smart contracts)
2. npm test (backend)
3. cd web && npm run build (frontend build check)
4. bash scripts/smoke_test.sh (if server is running)
5. Print summary: X passed, Y failed per suite
```

**`.claude/commands/satelink-commit.md`:**
```markdown
# /satelink-commit
Formats commit message using current task ID and pushes to feature branch.

Steps:
1. Read current task ID from agent/memory/CURRENT_TASK.md
2. git add -A
3. git commit -m "feat(TASK-ID): [description from CURRENT_TASK.md]"
4. git push origin [current branch]
5. Update PROGRESS.md task status to DONE
6. Delete CURRENT_TASK.md (task complete)
```

**`.claude/commands/satelink-stage.md`:**
```markdown
# /satelink-stage
Marks all tasks in current stage as complete and advances PROGRESS.md to next stage.

Steps:
1. Read current stage from PROGRESS.md
2. Confirm all tasks in stage are DONE
3. If not: print what's still PENDING, stop
4. If all DONE: update PROGRESS.md stage header to COMPLETE
5. Print next stage name and first task
```

**`.claude/commands/satelink-rpc-check.md`:**
```markdown
# /satelink-rpc-check
Pings all RPC providers (Polygon Amoy + mainnet) and reports latency.

Steps:
1. curl POST to https://rpc-amoy.polygon.technology with eth_blockNumber
2. curl POST to https://polygon-rpc.com with eth_blockNumber
3. curl POST to https://rpc.ankr.com/polygon_amoy with eth_blockNumber
4. Print: provider, latency ms, block number, pass/fail
5. Alert if any provider returns error or latency > 2000ms
```

### 2E — Create .claude/subagents/ (8 role definitions)

**`.claude/subagents/contracts-agent.md`:**
```markdown
# ContractsAgent
Scope: contracts/ only
Tools: forge, git, read, write
Role: Foundry tests, deploy scripts, ABI verification, gas optimization
Gate: Blocks deploy if any forge test fails
Rules:
  - All contracts must have AccessControl, Pausable, ReentrancyGuard where applicable
  - No mutable epoch rewrites
  - Target chain: Polygon (Amoy testnet → mainnet)
  - USDT is ERC-20 only — no ETH settlement
  - Run forge test -vvv before any deploy
  - Verify on Polygonscan after deploy
```

**`.claude/subagents/backend-agent.md`:**
```markdown
# BackendAgent
Scope: src/ only
Tools: bash, read, write, npm
Role: Express routes, services, middleware, async bug fixes
Gate: ALL db queries must have await — run grep check before commit
Rules:
  - PostgreSQL only — never import better-sqlite3
  - Every db.query() call must be awaited
  - No hardcoded secrets — all via process.env
  - No __test routes in production
  - Rate limiting on all public endpoints
  - RBAC middleware on all admin routes
  Priority tasks:
    1. Fix billing middleware async bugs (billing revenue broken)
    2. Replace 4 fake stub services
    3. Verify epoch pipeline fully async
```

**`.claude/subagents/frontend-agent.md`:**
```markdown
# FrontendAgent
Scope: web/ only
Tools: bash, read, write, npm
Role: Next.js pages, dashboard components, API integration
Gate: npm run build must pass before any PR
Rules:
  - Verify each API endpoint response matches expected JSON schema before rendering
  - Environment: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CHAIN_ID must be set
  - Polygon chain ID: 137 (mainnet), 80002 (Amoy testnet)
  - No Fuse Network references anywhere in frontend
  - shadcn/ui components only for dashboard
  - All wallet interactions use ethers.js with Polygon provider
```

**`.claude/subagents/security-agent.md`:**
```markdown
# SecurityAgent
Scope: entire repo
Tools: grep, read, bash
Role: Scan for vulnerabilities, block unsafe merges
Gate: HAS VETO POWER — any FAIL blocks deployment
Checks:
  1. Hardcoded secrets (grep for private keys, JWT secrets, API keys)
  2. Exposed __test routes in non-test files
  3. SQLite imports anywhere in src/
  4. Missing auth middleware on admin routes
  5. JWT fallback values (anything !== process.env.JWT_SECRET)
  6. Committed .env files or token.txt files
  7. Real wallet private keys in any tracked file
  8. token.txt — if exists in repo, IMMEDIATE flag
```

**`.claude/subagents/economics-agent.md`:**
```markdown
# EconomicsAgent
Scope: src/services/, contracts/
Tools: read, bash, node
Role: Validate 50/30/20 split, reserve logic, epoch ledger hash
Checks:
  - Sum(revenue events) must equal distributed amount
  - Split: exactly 50% operators / 30% platform / 20% distribution pool
  - Minimum claim: 10 USDT
  - Cooldown: 24 hours between claims per wallet
  - Reserve cap: 6 months infrastructure cost per node
  - Epoch finalization: Merkle root anchored on Polygon before claims open
  - No negative balances anywhere in ledger
```

**`.claude/subagents/devops-agent.md`:**
```markdown
# DevOpsAgent
Scope: .github/, docker-compose*, scripts/, Dockerfile*
Tools: bash, read, write, docker
Role: CI pipeline, Docker builds, deployment scripts
Tasks:
  - Maintain 6 GitHub Actions workflows
  - Docker image < 500MB (warn if exceeded)
  - All secrets via GitHub Secrets (never in YAML values)
  - Post-deploy smoke test must pass before marking deploy green
  - Auto-rollback on smoke test failure
  - Notify Discord + Slack on all CI failures
```

**`.claude/subagents/sentinel-agent.md`:**
```markdown
# SentinelAgent
Scope: src/sentinel/
Tools: read, write, bash
Role: Revenue integrity enforcement — runs every 60 seconds
Five modules:
  1. RevenueIntegrityGuard: sum(events) vs on-chain anchored amount → pause claims on mismatch
  2. TreasuryLiquidityGuardian: vault USDT / total claims ratio → block withdrawals if < 1.0
  3. DemandShockDetector: ops/hour rate → throttle to verified tier on 10x spike
  4. InfraReserveAuditor: per-node reserve vs 6-month cap → redirect overflow to operator earnings
  5. ClaimBehaviorAnalyzer: multi-wallet same-IP patterns → flag wallet, freeze withdrawal
Alert channels: Discord webhook + Slack webhook on any module trigger
```

**`.claude/subagents/docs-agent.md`:**
```markdown
# DocsAgent
Scope: docs/, *.md, agent/memory/
Tools: read, write
Role: Keep architecture docs, API docs, PROGRESS.md in sync
Rules:
  - After every completed task: update PROGRESS.md
  - After every ADR: update agent/memory/DECISIONS.md
  - After every bug fix: update agent/memory/BUG_LOG.md
  - No Fuse Network references anywhere in docs
  - DEPLOY_FUSE.md → DEPLOY_POLYGON.md (already migrated)
  - Keep docs/README.md API docs current with actual routes
```

### 2F — Create .vscode/tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🚀 dev:backend",
      "type": "shell",
      "command": "node --env-file=.env src/server.js",
      "group": "build",
      "presentation": { "panel": "dedicated", "reveal": "always" },
      "problemMatcher": []
    },
    {
      "label": "🌐 dev:frontend",
      "type": "shell",
      "command": "cd web && npm run dev",
      "group": "build",
      "presentation": { "panel": "dedicated", "reveal": "always" },
      "problemMatcher": []
    },
    {
      "label": "⚡ dev:all",
      "dependsOn": ["🚀 dev:backend", "🌐 dev:frontend"],
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": []
    },
    {
      "label": "🐳 docker:up",
      "type": "shell",
      "command": "docker-compose up -d postgres redis",
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "🐳 docker:down",
      "type": "shell",
      "command": "docker-compose down",
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "⚗️  forge:test",
      "type": "shell",
      "command": "forge test -vvv",
      "group": "test",
      "problemMatcher": []
    },
    {
      "label": "🔒 satelink:audit",
      "type": "shell",
      "command": "bash scripts/security/check-secrets.sh && bash scripts/security/check-test-endpoints.sh && bash scripts/security/check-sqlite.sh && bash scripts/security/check-auth-middleware.sh && bash scripts/security/check-hardcoded-keys.sh && bash scripts/security/check-jwt-fallback.sh && echo '✅ ALL SECURITY GATES PASSED'",
      "group": "test",
      "presentation": { "panel": "dedicated", "reveal": "always" },
      "problemMatcher": []
    },
    {
      "label": "📊 satelink:status",
      "type": "shell",
      "command": "cat agent/memory/PROGRESS.md | head -50",
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "🧪 test:backend",
      "type": "shell",
      "command": "npm test",
      "group": "test",
      "problemMatcher": []
    },
    {
      "label": "🏗️  build:frontend",
      "type": "shell",
      "command": "cd web && npm run build",
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "💨 smoke:test",
      "type": "shell",
      "command": "bash scripts/smoke_test.sh",
      "group": "test",
      "problemMatcher": []
    },
    {
      "label": "📡 rpc:check",
      "type": "shell",
      "command": "curl -s -X POST https://rpc-amoy.polygon.technology -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' | jq .result",
      "group": "test",
      "problemMatcher": []
    }
  ]
}
```

### 2G — Create .vscode/settings.json

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "files.exclude": {
    ".claude/worktrees": true,
    "node_modules": true,
    "out": true,
    "dist": true,
    ".next": true
  },
  "eslint.workingDirectories": [".", "web"],
  "solidity.compileUsingRemoteVersion": "0.8.24",
  "solidity.packageDefaultDependenciesContractsDirectory": "src",
  "solidity.packageDefaultDependenciesDirectory": "lib",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "terminal.integrated.env.osx": {
    "NODE_ENV": "development"
  },
  "git.confirmSync": false,
  "search.exclude": {
    "node_modules": true,
    ".next": true,
    "dist": true,
    "out": true
  }
}
```

### 2H — Create .vscode/extensions.json

```json
{
  "recommendations": [
    "anthropic.claude-vscode",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "nomicfoundation.hardhat-solidity",
    "tamasfe.even-better-toml",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "rangav.vscode-thunder-client",
    "christian-kohler.path-intellisense",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### 2I — Create scripts/security/ (6 gate scripts)

**`scripts/security/check-secrets.sh`:**
```bash
#!/usr/bin/env bash
# Gate 1: No hardcoded secrets or private keys in source
set -euo pipefail
FAIL=0
echo "🔒 [GATE 1] Scanning for hardcoded secrets..."

# Check for private key patterns
if grep -rn "0x[0-9a-fA-F]\{64\}" src/ contracts/ web/src/ --include="*.js" --include="*.ts" --include="*.sol" 2>/dev/null | grep -v "//\|test\|mock\|example\|placeholder"; then
  echo "❌ FAIL: Potential private key found in source code"
  FAIL=1
fi

# Check for literal JWT secrets
if grep -rn "jwt_secret\|JWT_SECRET\s*=\s*['\"][^'\"]\{8,\}" src/ web/src/ --include="*.js" --include="*.ts" 2>/dev/null | grep -v "process\.env"; then
  echo "❌ FAIL: Hardcoded JWT secret detected"
  FAIL=1
fi

# Check for token.txt in tracked files
if git ls-files | grep -i "token\.txt\|secret\.txt\|private\.key" 2>/dev/null; then
  echo "❌ FAIL: Sensitive file tracked in git"
  FAIL=1
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No hardcoded secrets found" || exit 1
```

**`scripts/security/check-test-endpoints.sh`:**
```bash
#!/usr/bin/env bash
# Gate 2: No __test routes in production-eligible code
set -euo pipefail
FAIL=0
echo "🔒 [GATE 2] Scanning for __test endpoints in production code..."

if grep -rn "__test\|/simulation\|/seed\|/mock-login" src/routes/ src/server.js --include="*.js" --include="*.ts" 2>/dev/null | grep -v "NODE_ENV.*test\|if.*test\|process\.env"; then
  echo "❌ FAIL: Unguarded __test or simulation route found in production code"
  FAIL=1
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No unguarded test endpoints found" || exit 1
```

**`scripts/security/check-sqlite.sh`:**
```bash
#!/usr/bin/env bash
# Gate 3: No SQLite imports anywhere in src/
set -euo pipefail
FAIL=0
echo "🔒 [GATE 3] Scanning for SQLite usage..."

if grep -rn "better-sqlite3\|sqlite3\|\.sqlite\|SQLITE" src/ scripts/ --include="*.js" --include="*.ts" 2>/dev/null | grep -v "//\|#.*sqlite\|\.db-shm\|\.db-wal"; then
  echo "❌ FAIL: SQLite reference found — PostgreSQL only"
  FAIL=1
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No SQLite usage found" || exit 1
```

**`scripts/security/check-auth-middleware.sh`:**
```bash
#!/usr/bin/env bash
# Gate 4: All /admin routes have auth middleware
set -euo pipefail
FAIL=0
echo "🔒 [GATE 4] Verifying auth middleware on admin routes..."

# Find admin route files
ADMIN_FILES=$(find src/routes/ -name "*admin*" -o -name "*control*" 2>/dev/null)

for f in $ADMIN_FILES; do
  if ! grep -q "requireAuth\|authenticate\|verifyToken\|requireRole\|middleware" "$f" 2>/dev/null; then
    echo "❌ FAIL: $f — no auth middleware detected"
    FAIL=1
  fi
done

[ $FAIL -eq 0 ] && echo "✅ PASS: Auth middleware present on admin routes" || exit 1
```

**`scripts/security/check-hardcoded-keys.sh`:**
```bash
#!/usr/bin/env bash
# Gate 5: No hardcoded API keys
set -euo pipefail
FAIL=0
echo "🔒 [GATE 5] Scanning for hardcoded API keys..."

# Common API key patterns
PATTERNS=(
  "sk_live_[a-zA-Z0-9]"
  "sk_test_[a-zA-Z0-9]"
  "AKIA[0-9A-Z]{16}"
  "moonpay_sk_"
  "nodeops_key_"
)

for pattern in "${PATTERNS[@]}"; do
  if grep -rn "$pattern" src/ web/src/ --include="*.js" --include="*.ts" 2>/dev/null | grep -v "process\.env\|//\|example"; then
    echo "❌ FAIL: Hardcoded API key pattern '$pattern' found"
    FAIL=1
  fi
done

[ $FAIL -eq 0 ] && echo "✅ PASS: No hardcoded API keys found" || exit 1
```

**`scripts/security/check-jwt-fallback.sh`:**
```bash
#!/usr/bin/env bash
# Gate 6: No JWT fallback values (env.js must hard-fail)
set -euo pipefail
FAIL=0
echo "🔒 [GATE 6] Verifying no JWT fallback values..."

# Check for fallback patterns like: JWT_SECRET || 'some-default'
if grep -rn "JWT_SECRET.*||.*['\"]" src/ --include="*.js" --include="*.ts" 2>/dev/null; then
  echo "❌ FAIL: JWT_SECRET fallback value detected — must hard-fail if missing"
  FAIL=1
fi

# Verify env.js throws on missing JWT_SECRET
if [ -f "src/config/env.js" ]; then
  if ! grep -q "throw\|process\.exit\|fatal\|FATAL" src/config/env.js 2>/dev/null; then
    echo "❌ FAIL: src/config/env.js does not hard-fail on missing JWT_SECRET"
    FAIL=1
  fi
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No JWT fallback values found" || exit 1
```

Make all scripts executable:
```bash
chmod +x scripts/security/*.sh
```

### 2J — Create scripts/smoke_test.sh

```bash
#!/usr/bin/env bash
# Smoke test — run after deploy to verify system is alive
set -euo pipefail
API_URL="${API_URL:-http://localhost:8080}"
FAIL=0

echo "💨 Running Satelink smoke tests against $API_URL"

check() {
  local name="$1"
  local url="$2"
  local expected="$3"
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  if [ "$response" = "$expected" ]; then
    echo "  ✅ $name ($response)"
  else
    echo "  ❌ $name — expected $expected, got $response"
    FAIL=1
  fi
}

check "Health endpoint" "$API_URL/health" "200"
check "API mode" "$API_URL/api/mode" "200"
check "Test route blocked" "$API_URL/__test/auth/login" "403"
check "Simulation route blocked" "$API_URL/simulation/status" "403"
check "Unauthenticated admin blocked" "$API_URL/api/admin/stats" "401"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "✅ ALL SMOKE TESTS PASSED"
else
  echo ""
  echo "❌ SMOKE TESTS FAILED — triggering rollback"
  exit 1
fi
```

### 2K — Create scripts/rollback.sh

```bash
#!/usr/bin/env bash
# Auto-rollback to previous Docker tag on smoke test failure
set -euo pipefail
REGISTRY="${REGISTRY:-ghcr.io/satelinkinternet-collab/satelink}"
PREVIOUS_TAG="${1:-previous}"

echo "🔄 ROLLBACK: reverting to $REGISTRY:$PREVIOUS_TAG"

docker pull "$REGISTRY:$PREVIOUS_TAG"
docker stop satelink-backend 2>/dev/null || true
docker rm satelink-backend 2>/dev/null || true
docker run -d \
  --name satelink-backend \
  --restart unless-stopped \
  --env-file .env \
  -p 8080:8080 \
  "$REGISTRY:$PREVIOUS_TAG"

echo "✅ Rollback complete — running smoke test on reverted version"
sleep 5
bash scripts/smoke_test.sh

# Notify
curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"⚠️ **Satelink AUTO-ROLLBACK** executed — reverted to tag \`$PREVIOUS_TAG\` due to smoke test failure.\"}" 2>/dev/null || true

curl -s -X POST "${SLACK_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"⚠️ *Satelink AUTO-ROLLBACK* — reverted to \`$PREVIOUS_TAG\`\"}" 2>/dev/null || true
```

### 2L — Create .github/workflows/security-gate.yml

```yaml
name: Security Gate

on:
  push:
    branches: [main, develop, staging]
  pull_request:
    branches: [main, develop]

jobs:
  security-gates:
    name: Security Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Gate 1 — Hardcoded Secrets
        run: bash scripts/security/check-secrets.sh

      - name: Gate 2 — Test Endpoints
        run: bash scripts/security/check-test-endpoints.sh

      - name: Gate 3 — SQLite Usage
        run: bash scripts/security/check-sqlite.sh

      - name: Gate 4 — Auth Middleware
        run: bash scripts/security/check-auth-middleware.sh

      - name: Gate 5 — Hardcoded API Keys
        run: bash scripts/security/check-hardcoded-keys.sh

      - name: Gate 6 — JWT Fallback
        run: bash scripts/security/check-jwt-fallback.sh

      - name: Notify security failure
        if: failure()
        run: |
          curl -s -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"🚨 **SECURITY GATE FAILED** on \`${{ github.ref_name }}\` by ${{ github.actor }} — MERGE BLOCKED. ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"}"
          curl -s -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"🚨 *SECURITY GATE FAILED* on \`${{ github.ref_name }}\` by ${{ github.actor }} — MERGE BLOCKED.\"}"
```

### 2M — Create .github/workflows/notify.yml (deployment + epoch events)

```yaml
name: Satelink Notifications

on:
  workflow_run:
    workflows: ["Satelink CI/CD"]
    types: [completed]
  schedule:
    - cron: '*/15 * * * *'  # RPC health check every 15 min

jobs:
  notify-ci-result:
    name: CI Result Notification
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_run'
    steps:
      - name: Notify Success
        if: github.event.workflow_run.conclusion == 'success'
        run: |
          curl -s -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"✅ **Satelink CI PASSED** — branch \`${{ github.event.workflow_run.head_branch }}\` | commit \`${{ github.event.workflow_run.head_sha }}\`\"}"

      - name: Notify Failure
        if: github.event.workflow_run.conclusion == 'failure'
        run: |
          curl -s -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"❌ **Satelink CI FAILED** — branch \`${{ github.event.workflow_run.head_branch }}\` | <${{ github.event.workflow_run.html_url }}|View Run>\"}"
          curl -s -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"❌ *CI FAILED* on \`${{ github.event.workflow_run.head_branch }}\` <${{ github.event.workflow_run.html_url }}|View>\"}"

  rpc-health-check:
    name: Polygon RPC Health
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - name: Check Polygon Amoy RPC
        run: |
          RESULT=$(curl -s -X POST https://rpc-amoy.polygon.technology \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r .result)
          if [ -z "$RESULT" ] || [ "$RESULT" = "null" ]; then
            echo "RPC_FAIL=true" >> $GITHUB_ENV
          else
            echo "RPC_BLOCK=$RESULT" >> $GITHUB_ENV
          fi

      - name: Alert on RPC failure
        if: env.RPC_FAIL == 'true'
        run: |
          curl -s -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"⚠️ **Polygon Amoy RPC OFFLINE** — scheduled health check failed. Investigate immediately.\"}"
          curl -s -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"⚠️ *Polygon Amoy RPC OFFLINE* — health check failed.\"}"
```

### 2N — Add GitHub Secrets via gh CLI

```bash
echo "Adding GitHub Secrets..."

# Notification webhooks (from user config)
gh secret set DISCORD_WEBHOOK_URL --body "https://discord.com/api/webhooks/1494267168991350915/y95hkw6acJOyaGZH0spUwAQ-wnMahY2NubgFoodBWRoTDAYa3HtOrvihpBqXejSlvR5p" 2>/dev/null && echo "✅ DISCORD_WEBHOOK_URL set" || echo "⚠️  DISCORD_WEBHOOK_URL — run manually: gh secret set DISCORD_WEBHOOK_URL"

gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/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" 2>/dev/null && echo "✅ SLACK_WEBHOOK_URL set" || echo "⚠️  SLACK_WEBHOOK_URL — run manually: gh secret set SLACK_WEBHOOK_URL"

# Prompt for sensitive secrets (never hardcode these)
echo ""
echo "=== MANUAL SECRETS REQUIRED ==="
echo "Run these commands with your actual values:"
echo ""
echo "  gh secret set JWT_SECRET"
echo "  gh secret set DATABASE_URL"
echo "  gh secret set REDIS_URL"
echo "  gh secret set RPC_URL"
echo "  gh secret set DEPLOYER_PK"
echo "  gh secret set TREASURY_ADDRESS"
echo "  gh secret set POLYGONSCAN_API_KEY"
echo "  gh secret set VERCEL_TOKEN"
echo "  gh secret set VERCEL_ORG_ID"
echo "  gh secret set VERCEL_PROJECT_ID"
```

### 2O — Create docs/mcp-servers.md

```markdown
# Satelink MCP Servers

## Connected MCP Servers (Claude.ai)

| Server | URL | Purpose for Satelink |
|--------|-----|----------------------|
| GitHub | github.mcp.claude.com | Branch management, PR, CI status, issue tracking |
| Google Drive | drivemcp.googleapis.com | Architecture PDFs, execution plans, audit reports |
| Google Calendar | gcal.mcp.claude.com | Milestone scheduling (ICS import for stage deadlines) |
| Gmail | gmail.mcp.claude.com | Node operator notifications, investor updates |
| Vercel | mcp.vercel.com | Deploy frontend, manage env vars, preview deploys |
| Cloudflare | bindings.mcp.cloudflare.com | DNS, Workers, D1 (future), R2 storage |
| Context7 | mcp.context7.com | Live docs: Node.js, Solidity, Next.js, Foundry, ethers.js |
| Amplitude | mcp.amplitude.com | API usage analytics, developer call tracking |
| Figma | mcp.figma.com | Dashboard UI designs, component specs |

## Custom MCP Servers (To Build — Stage S6+)

### satelink-db-mcp
- Purpose: Claude Code reads live PostgreSQL state without raw SQL
- Queries: nodes, epochs, revenue events, treasury balance
- Used for: audit tasks, debugging sessions

### satelink-polygon-mcp
- Purpose: Wrap Polygon RPC — check contract state on-chain
- Queries: treasury balance, claim status, node registry
- Replaces: manual ethers.js calls during debugging

### satelink-redis-mcp
- Purpose: Inspect Redis queues, cache, rate limit counters
- Used for: debugging RPC gateway, epoch pipeline, sentinel

### satelink-ci-mcp
- Purpose: Query GitHub Actions status, trigger reruns, read logs
- Used for: CI debugging without leaving Claude Code session

## Context7 Libraries (Pre-load for Satelink)
- /vercel/next.js — Next.js app router, API routes
- /expressjs/express — Express routing, middleware
- /OpenZeppelin/openzeppelin-contracts — Solidity security patterns
- /ethers-io/ethers.js — Polygon wallet/contract interactions
- /redis/node-redis — Redis queue and cache patterns
- /brianc/node-postgres — PostgreSQL client patterns
- /foundry-rs/foundry — Forge testing docs
```

### 2P — Create agent/memory/PROGRESS.md (if not exists or upgrade if outdated)

Check if PROGRESS.md exists and has correct stage tracking:
```bash
if [ ! -f "agent/memory/PROGRESS.md" ]; then
cat > agent/memory/PROGRESS.md << 'PROGRESS_EOF'
# SATELINK PROGRESS TRACKER
# Updated: April 2026
# Network: Polygon (migrated from Fuse)
# DB: PostgreSQL (migrated from SQLite)

## OVERALL STATUS
Total Tasks: 121 | Complete: 6 | In Progress: 0 | Pending: 115
Revenue Readiness: 28% | Production: 25% | Launch: 20%

## STAGE S0 — Production Blockers & Security Foundation (6/15)
| ID | Task | Status | Notes |
|----|------|--------|-------|
| S0-001 | NodeRegistryV2 contract | DONE | AccessControl + Pausable |
| S0-002 | RevenueDistributor contract | DONE | USDT ERC-20, Polygon |
| S0-003 | ClaimsContract | DONE | ReentrancyGuard, 10 USDT min, 24h cooldown |
| S0-004 | SplitEngine | DONE | Governance basis points, 5% cap |
| S0-005 | Branch consolidation (35 branches) | PENDING | |
| S0-006 | env.js hard-fail on missing JWT_SECRET | DONE | No fallback |
| S0-007 | Fix billing middleware async bugs | PENDING | P0 — revenue broken |
| S0-008 | Fix all 9 async/sync DB bugs | PENDING | P0 — silent data corruption |
| S0-009 | Remove 733 duplicate OZ files in utils/lib/ | PENDING | |
| S0-010 | Remove 4 fake stub services | PENDING | |
| S0-011 | Remove real JWT from token.txt | PENDING | P0 security |
| S0-012 | .env.example with all vars | DONE | |
| S0-013 | Ecosystem setup (CLAUDE.md, hooks, CI gates) | IN_PROGRESS | This task |
| S0-014 | Git branch governance + protection rules | PENDING | |
| S0-015 | CI security gate scripts | PENDING | |

## STAGE S1-RPC — Multi-RPC Gateway (0/12)
[All PENDING]

## STAGES S1–S9 — See Master Execution Plan
[Reference: Satelink_Master_Execution_Plan.docx]
PROGRESS_EOF
echo "✅ Created agent/memory/PROGRESS.md"
else
  echo "✅ agent/memory/PROGRESS.md already exists — check S0-013 status and update to IN_PROGRESS"
  sed -i 's/| S0-013 | Ecosystem setup.*| PENDING /| S0-013 | Ecosystem setup (CLAUDE.md, hooks, CI gates) | IN_PROGRESS /' agent/memory/PROGRESS.md 2>/dev/null || true
fi
```

---

## PHASE 3: GITIGNORE VERIFICATION + UPDATE

Verify `.gitignore` has all required entries. Append any missing:

```bash
REQUIRED_IGNORES=(
  ".claude/"
  "satelink-keys/"
  "satelink-env/"
  ".env.local"
  ".env.production"
  "token.txt"
  "*.key"
  "*.pem"
  "forge-cache/"
  ".foundry/"
)

for entry in "${REQUIRED_IGNORES[@]}"; do
  if ! grep -qF "$entry" .gitignore 2>/dev/null; then
    echo "$entry" >> .gitignore
    echo "Added to .gitignore: $entry"
  fi
done
echo "✅ .gitignore verified"
```

---

## PHASE 4: FINAL VERIFICATION

Run this after all setup is complete:

```bash
echo ""
echo "=== FINAL ECOSYSTEM VERIFICATION ==="
echo ""

PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo "  ✅ $1"; ((PASS++))
  else
    echo "  ❌ MISSING: $1"; ((FAIL++))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo "  ✅ $1/"; ((PASS++))
  else
    echo "  ❌ MISSING DIR: $1"; ((FAIL++))
  fi
}

echo "--- Core Brain ---"
check_file ".claude/CLAUDE.md"
check_file ".claude/settings.json"
check_dir ".claude/commands"
check_dir ".claude/subagents"

echo "--- Agent Memory ---"
check_file "agent/memory/PROGRESS.md"
check_file "agent/memory/DECISIONS.md"
check_file "agent/memory/BUG_LOG.md"

echo "--- VS Code ---"
check_file ".vscode/tasks.json"
check_file ".vscode/settings.json"
check_file ".vscode/extensions.json"

echo "--- Security Gates ---"
for f in check-secrets check-test-endpoints check-sqlite check-auth-middleware check-hardcoded-keys check-jwt-fallback; do
  check_file "scripts/security/$f.sh"
done

echo "--- Scripts ---"
check_file "scripts/smoke_test.sh"
check_file "scripts/rollback.sh"

echo "--- CI Workflows ---"
check_file ".github/workflows/satelink-ci.yml"
check_file ".github/workflows/security-gate.yml"
check_file ".github/workflows/notify.yml"

echo "--- Docs ---"
check_file "docs/DEPLOY_POLYGON.md"
check_file "docs/mcp-servers.md"

echo "--- Postgres (not SQLite) ---"
if ! grep -q "better-sqlite3" scripts/migrate.js 2>/dev/null; then
  echo "  ✅ migrate.js uses PostgreSQL"; ((PASS++))
else
  echo "  ❌ migrate.js still has SQLite"; ((FAIL++))
fi

echo ""
echo "=== RESULT: $PASS PASSED | $FAIL FAILED ==="

if [ $FAIL -eq 0 ]; then
  echo "✅ ECOSYSTEM SETUP COMPLETE"
  # Send success notification
  curl -s -X POST "${DISCORD_WEBHOOK_URL:-}" \
    -H "Content-Type: application/json" \
    -d '{"content": "✅ **Satelink Ecosystem Setup Complete** — CLAUDE.md, subagents, security gates, CI notifications, VS Code workspace all configured."}' 2>/dev/null || true
else
  echo "❌ $FAIL items still need attention — re-run failed phases"
  exit 1
fi
```

---

## POST-SETUP: NEXT IMMEDIATE ACTIONS

After verification passes, your next tasks in order:

1. **`gh secret set JWT_SECRET`** — paste your 64-char secret
2. **`gh secret set DATABASE_URL`** — your PostgreSQL connection string
3. **`gh secret set RPC_URL`** — `https://rpc-amoy.polygon.technology`
4. **Run `/satelink-audit`** — verify all 6 security gates pass
5. **Run `/satelink-status`** — confirm PROGRESS.md shows S0-013 IN_PROGRESS
6. **Next task: S0-007** — fix billing middleware async bugs (revenue is broken)

---
# END OF SATELINK ECOSYSTEM SETUP PROMPT
# Version 2.0 | Polygon Network | PostgreSQL | April 2026
