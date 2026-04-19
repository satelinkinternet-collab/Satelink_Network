# SATELINK — REVENUE ARCHITECTURE IMPLEMENTATION
# Based on: DePIN Economic Viability Analysis — April 2026
# Network: Polygon | DB: PostgreSQL | Settlement: USDT ERC-20
# 
# PURPOSE: This file serves two roles:
#   1. Strategic todo — what must exist for machine revenue to work
#   2. Claude Code prompt — paste into Claude Code to implement NOW
#
# HOW TO USE:
#   Paste into Claude Code: "Read SATELINK_REVENUE_ARCHITECTURE.md and execute it"
#   Claude Code will audit existing state, implement what's missing, skip what exists

---

## REALITY VERDICT (locked in — do not revisit)
- Model: PARTIALLY VIABLE
- Humans seed once → machines scale autonomously
- First payout reachable in 4–6 weeks from today
- Three things blocking revenue RIGHT NOW:
  1. Billing middleware has zero await calls (S0-007) — revenue not recorded
  2. No live public RPC endpoint machines can hit (Phase 1)
  3. Minimum claim threshold 10 USDT too high for early stage (needs 1 USDT)

---

## SECTION 1 — DEMAND SOURCE IMPLEMENTATION

### What must exist for machine-originated demand:

**1A — Public JSON-RPC Endpoint (THE most critical missing piece)**

STATUS: Check if `src/routes/rpc*.js` or `src/services/rpc/` exists with a real proxy
ACTION IF MISSING: Create it now

Claude Code — execute this audit then implement:

```
AUDIT:
- Check if GET/POST /rpc returns a real proxied JSON-RPC response (not a stub)
- Check src/services/rpc/ for rpc_proxy.js or equivalent
- Check if the endpoint is mounted in src/server.js
- Check sql/011_rpc_gateway.sql for PG compatibility (no AUTOINCREMENT — use SERIAL)

IF /rpc is a stub or missing:
  Create src/services/rpc/rpc_proxy.js:
  - Accept POST /rpc with JSON-RPC body
  - Validate method against rpc_method_pricing table
  - Route to provider in rpc_providers table (fallback to env RPC_URL)
  - Log to rpc_requests table (PostgreSQL, all awaited)
  - Return JSON-RPC response to caller
  - Bill: record revenue_event with source=rpc_request, amount from rpc_method_pricing
  Mount as: app.use('/rpc', rpcGate, createRpcRouter(db))
  
IF sql/011_rpc_gateway.sql has AUTOINCREMENT:
  Replace all AUTOINCREMENT with SERIAL (PostgreSQL syntax)
  This is a blocking bug — SQLite schema won't run on PG
```

**1B — Machine-Readable Pricing API**

STATUS: Check if GET /workload/pricing returns JSON with current prices
ACTION IF MISSING: Create it

```
AUDIT:
- curl http://localhost:8080/workload/pricing — does it return pricing JSON?
- Check if rpc_method_pricing table has seed data

IF missing or empty:
  Create GET /api/pricing (public, no auth required) returning:
  {
    "rpc": {
      "eth_call": 0.00003,
      "eth_getBalance": 0.00001,
      "eth_sendRawTransaction": 0.0001,
      "eth_getLogs": 0.00005
    },
    "currency": "USDT",
    "chain_id": 80002,
    "updated_at": <timestamp>
  }
  
  Seed rpc_method_pricing table with at least 8 common methods
  This endpoint must be public — no API key required
  Machines query this to decide if they should route here
```

**1C — Machine-Readable SLA / Status API**

STATUS: Check if /api/nodes/sla or /api/status returns JSON uptime data
ACTION IF MISSING: Create it

```
AUDIT:
- Does GET /api/status or /api/nodes/sla exist and return JSON?

IF missing:
  Create GET /api/status (public, no auth) returning:
  {
    "ok": true,
    "network": {
      "nodes_online": <count from registered_nodes where status=active>,
      "avg_uptime_pct": <from node telemetry>,
      "avg_latency_ms": <from rpc_providers>,
      "chains_supported": [80002, 137, 1, 137]
    },
    "sla": {
      "target_uptime": 99.5,
      "current_uptime": <real value>,
      "p99_latency_ms": <real value>
    },
    "timestamp": <now>
  }
  
  Automated systems query this before routing traffic here
  If it doesn't exist, no routing tool will trust the network
```

---

## SECTION 2 — BOOTSTRAPPING PROBLEM IMPLEMENTATION

### The only viable bootstrap sequence:

**2A — Satelink-Operated Node #1 (you run it)**

STATUS: Check if any node is registered in registered_nodes with status=active
ACTION: Register Node #1 manually if none exists

```
AUDIT:
- Query: SELECT count(*) FROM registered_nodes WHERE status = 'active'
- If 0 nodes: the network cannot process any workload

IF no active nodes:
  Create scripts/bootstrap/register_node1.js:
  
  import pkg from 'pg';
  const { Pool } = pkg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const node = {
    node_id: 'NODE-SATELINK-001',
    wallet: process.env.TREASURY_ADDRESS,
    node_type: 'NODEOPS_MANAGED',
    infra_model: 'RESERVE_FUNDED',
    endpoint_url: process.env.NODE1_ENDPOINT_URL || 'http://localhost:8080',
    region: 'ap-south-1',
    chain_ids: JSON.stringify([80002, 137, 1]),
    status: 'active',
    tier: 'platinum',
    registered_at: Date.now()
  };
  
  await pool.query(`
    INSERT INTO registered_nodes 
    (node_id, wallet, node_type, infra_model, endpoint_url, region, chain_ids, status, tier, registered_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (node_id) DO UPDATE SET status = 'active', updated_at = $10
  `, Object.values(node));
  
  console.log('Node #1 registered:', node.node_id);
  pool.end();
  
  Also add to rpc_providers table:
  INSERT INTO rpc_providers (node_id, endpoint_url, chain_id, provider_type, region, priority, status, max_rps)
  VALUES ('NODE-SATELINK-001', <RPC_URL from env>, 80002, 'node', 'ap-south-1', 1, 'active', 100)
  ON CONFLICT (node_id) DO NOTHING
```

**2B — Internal Test Workload (first real revenue event)**

STATUS: Check if any revenue_events exist in the DB
ACTION: Create a script that sends real RPC calls through the system

```
AUDIT:
- Query: SELECT count(*) FROM revenue_events WHERE source = 'rpc_request'
- If 0: no revenue has ever been recorded

IF no revenue events:
  Create scripts/bootstrap/seed_first_workload.js:
  
  // Sends 100 real JSON-RPC calls through the Satelink /rpc endpoint
  // This creates real revenue_events in the DB
  // This is the first proof-of-life for the economic model
  
  const API_URL = process.env.API_URL || 'http://localhost:8080';
  const API_KEY = process.env.BOOTSTRAP_API_KEY; // set in .env
  
  for (let i = 0; i < 100; i++) {
    const res = await fetch(`${API_URL}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: i + 1
      })
    });
    const data = await res.json();
    console.log(`Call ${i+1}: block=${data.result} status=${res.status}`);
    await new Promise(r => setTimeout(r, 100)); // 100ms between calls
  }
  console.log('100 RPC calls completed — check revenue_events table');
  
  Add npm script: "bootstrap:workload": "node scripts/bootstrap/seed_first_workload.js"
```

**2C — External Discovery Registration**

STATUS: These are manual steps — document them as a checklist

```
Create docs/BOOTSTRAP_CHECKLIST.md with these exact steps:

WEEK 1 — Internal:
[ ] Node #1 registered (scripts/bootstrap/register_node1.js)
[ ] 100 test RPC calls sent (scripts/bootstrap/seed_first_workload.js)  
[ ] revenue_events table shows > 0 records
[ ] First epoch closes with real data
[ ] Polygon transaction hash exists for first settlement

WEEK 2 — External discovery (manual, one-time per platform):
[ ] Submit to Chainlist.org: https://github.com/DefiLlama/chainlist
    Add Polygon Amoy RPC entry: { name: "Satelink", url: "https://rpc.satelink.network", tracking: "none" }
[ ] Register on dRPC.org as provider: https://drpc.org/partners
[ ] Register on Ankr protocol as community endpoint
[ ] Add to awesome-rpc list on GitHub
[ ] Post on r/ethdev and r/defi with public RPC URL

WEEK 3 — Autonomous:
[ ] First external RPC call from Chainlist user appears in rpc_requests
[ ] First external revenue_event recorded
[ ] Monitor: SELECT count(*), sum(cost_usdt) FROM rpc_requests WHERE created_at > <week3_start>
```

---

## SECTION 3 — ECONOMIC VIABILITY FIXES

**3A — Lower Minimum Claim Threshold to 1 USDT (early stage)**

STATUS: Check ClaimsContract.sol and src/services/ for MIN_CLAIM_AMOUNT
ACTION: Lower to 1 USDT for first 90 days

```
AUDIT:
- grep -r "MIN_CLAIM\|min_claim\|minimum.*10\|10.*USDT" contracts/ src/ --include="*.sol" --include="*.js"
- Current value: 10 USDT (confirmed from S0-003 implementation)

FIX in src/config/economics.js (or equivalent config file):
  Export: MIN_CLAIM_USDT = parseFloat(process.env.MIN_CLAIM_USDT || '1.0')
  
  This makes it configurable per environment:
  - .env: MIN_CLAIM_USDT=1.0   (early stage — 1 USDT)
  - .env: MIN_CLAIM_USDT=10.0  (post-growth — 10 USDT)
  
  Add to .env.example: MIN_CLAIM_USDT=1.0
  
  Do NOT change the smart contract — keep 10 USDT on-chain as the floor
  The backend enforces 1 USDT soft minimum during early stage
  On-chain minimum only applies when withdraw is called (not claim)
  
  Document this decision in agent/memory/DECISIONS.md:
  ADR-004: MIN_CLAIM_USDT set to 1 USDT via env for first 90 days
  Reason: 10 USDT threshold causes operator churn before first payout at low volume
  Review date: 90 days after first external workload
```

**3B — Pricing Seed Data (make the network priceable)**

STATUS: Check if rpc_method_pricing has rows
ACTION: Seed with competitive pricing (3x cheaper than Alchemy)

```
AUDIT:
- Query: SELECT count(*) FROM rpc_method_pricing
- If 0: no methods are priced, all RPC calls will fail billing

IF empty:
  Create sql/seed/001_rpc_pricing.sql:
  
  INSERT INTO rpc_method_pricing (method, category, base_cost_usdt, weight, cacheable, cache_ttl_sec, enabled)
  VALUES
    ('eth_blockNumber',           'read',    0.000001, 0.1, 1, 10,   1),
    ('eth_getBalance',            'read',    0.000010, 0.5, 1, 5,    1),
    ('eth_call',                  'read',    0.000030, 1.0, 1, 3,    1),
    ('eth_getTransactionReceipt', 'read',    0.000020, 0.8, 1, 60,   1),
    ('eth_getLogs',               'archive', 0.000050, 2.0, 1, 30,   1),
    ('eth_sendRawTransaction',    'write',   0.000100, 3.0, 0, 0,    1),
    ('eth_estimateGas',           'read',    0.000020, 0.8, 0, 0,    1),
    ('eth_getCode',               'archive', 0.000030, 1.2, 1, 300,  1),
    ('eth_gasPrice',              'read',    0.000005, 0.2, 1, 5,    1),
    ('eth_chainId',               'read',    0.000001, 0.1, 1, 3600, 1)
  ON CONFLICT (method) DO NOTHING;
  
  These prices are 30-50% cheaper than Alchemy ($0.00003/call)
  Price-sensitive bots will route here automatically
  
  Create npm script: "seed:pricing": "psql $DATABASE_URL -f sql/seed/001_rpc_pricing.sql"
```

---

## SECTION 4 — COMPETITIVE DIFFERENTIATION IMPLEMENTATION

**4A — Public Rate Card (machines need to compare you)**

STATUS: Check if /api/pricing is publicly accessible without auth
ACTION: Ensure endpoint exists and returns competitor-comparable data

```
Create or verify GET /api/pricing returns:
{
  "provider": "Satelink",
  "version": "1.0",
  "chains": {
    "137": { "name": "Polygon", "status": "active" },
    "80002": { "name": "Polygon Amoy", "status": "active" },
    "1": { "name": "Ethereum", "status": "coming_soon" }
  },
  "pricing": {
    "rpc": {
      "eth_call": { "usdt_per_call": 0.000030, "vs_alchemy": "-0%" },
      "eth_getBalance": { "usdt_per_call": 0.000010 },
      "eth_sendRawTransaction": { "usdt_per_call": 0.000100 }
    },
    "model": "pay_per_use",
    "minimum_deposit_usdt": 1.0,
    "settlement": "USDT on Polygon"
  },
  "sla": {
    "uptime_target": "99.5%",
    "p99_latency_target_ms": 200
  }
}

This must require ZERO authentication to access
Add CORS: allow all origins on /api/pricing and /rpc and /api/status
These three endpoints are your public face to automated systems
```

**4B — Workload Types Centralized Providers Reject**

STATUS: Document as future todo — implement stubs now

```
Create docs/COMPETITIVE_WORKLOADS.md documenting:

Workloads centralized providers REFUSE that Satelink CAN serve:
1. Residential IP proxying — ISPs ban datacenter IPs; our router nodes have residential IPs
2. Web scraping — AWS/GCP block scrapers; distributed residential nodes bypass this  
3. Grey-area automation — bots, monitors, watchers that violate ToS of big providers
4. High-volume low-cost RPC — we're 30-50% cheaper than Alchemy at scale

Phase 2 implementation (after first RPC revenue):
- Bandwidth proxy endpoint: POST /proxy with target URL
- Web scraper endpoint: POST /scrape with target and selectors
- These are the high-margin workloads that justify DePIN existence

For now: stub these endpoints returning 503 "coming soon"
so machines can see the surface area and plan integrations
```

---

## SECTION 5 — REQUIRED MISSING PIECES AUDIT

**Run this full audit and fix everything found:**

```
FULL MISSING PIECES AUDIT:

1. Public consumable endpoint
   CHECK: curl -X POST http://localhost:8080/rpc \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   EXPECTED: {"jsonrpc":"2.0","result":"0x...","id":1}
   IF FAIL: /rpc endpoint is stub or broken — fix before anything else

2. Machine-readable pricing
   CHECK: curl http://localhost:8080/api/pricing
   EXPECTED: JSON with method prices
   IF FAIL: create /api/pricing endpoint

3. SLA status endpoint  
   CHECK: curl http://localhost:8080/api/status
   EXPECTED: JSON with nodes_online, uptime, latency
   IF FAIL: create /api/status endpoint

4. On-chain proof of payout
   CHECK: Has any USDT transfer happened from TREASURY_ADDRESS on Polygon?
   EXPECTED: At least 1 Polygon transaction
   IF FAIL: This requires completing Phase 2 bootstrap

5. API key issuance working
   CHECK: POST /api/builder/keys or equivalent
   EXPECTED: Returns sk_... API key
   IF FAIL: API key creation is broken — check src/routes/ for builder or key route

6. Revenue event recording working (THE CRITICAL ONE)
   CHECK: After sending RPC call, query: SELECT * FROM revenue_events LIMIT 5
   EXPECTED: Rows with source=rpc_request and amount > 0
   IF FAIL: Billing middleware async bug (S0-007) — fix this FIRST

DOCUMENT all findings in agent/memory/BUG_LOG.md
```

---

## SECTION 6 — FAILURE MODE PREVENTION

**6A — Fix Minimum Claim Threshold (already covered in 3A)**

**6B — External Client Integration Path (create the onramp)**

STATUS: Check if docs/INTEGRATION_GUIDE.md exists with curl examples
ACTION IF MISSING: Create it

```
Create docs/INTEGRATION_GUIDE.md:

# How to route traffic to Satelink (for machines)

## JSON-RPC (Ethereum compatible)
Replace your current RPC URL with:
  https://rpc.satelink.network  (mainnet — coming soon)
  https://rpc-test.satelink.network  (Polygon Amoy — live now)

No API key needed for free tier (100 req/day limit)
For higher limits, get an API key: POST /api/keys/create

## Quick test
curl -X POST https://rpc-test.satelink.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

## Chainlist integration
We are listed on Chainlist.org — add Satelink as a custom RPC in MetaMask or any wallet

## Node.js SDK (coming in Stage S2)
npm install @satelink/sdk
const { SatelinkRPC } = require('@satelink/sdk');
const rpc = new SatelinkRPC({ apiKey: 'your-key' });
const block = await rpc.getBlockNumber();

Keep this simple. Machines and developers read this before integrating.
```

**6C — Billing Middleware Async Fix (S0-007 — already known P0)**

STATUS: PENDING — this is the next task after this file
ACTION: Must be fixed before any revenue testing

```
THIS IS THE MOST CRITICAL FIX.
After this file is implemented, immediately proceed to S0-007:

AUDIT billing middleware:
  grep -n "db.query\|db.prepare\|pool.query" src/middleware/billing*.js src/services/billing*.js

Every single DB call must have await in front of it.
Zero exceptions.
If billing fires and doesn't await the INSERT, the revenue event is lost silently.
Node does work → gets paid nothing → leaves network.

Fix pattern:
  WRONG: db.query('INSERT INTO revenue_events ...')
  RIGHT: await db.query('INSERT INTO revenue_events ...')
  
After fix: run 100 test RPC calls and verify revenue_events has 100 rows.
```

---

## SECTION 7 — PATH TO FIRST REVENUE (EXECUTION)

### Phase 1 — Make network consumable (implement NOW)

```
Execute these in order. Each one is a discrete implementable task.

TASK P1-001: Fix sql/011_rpc_gateway.sql — replace AUTOINCREMENT with SERIAL
  File: sql/011_rpc_gateway.sql
  Why: Current schema is SQLite syntax — won't run on PostgreSQL
  Done when: psql $DATABASE_URL -f sql/011_rpc_gateway.sql runs without error

TASK P1-002: Seed rpc_method_pricing table
  File: sql/seed/001_rpc_pricing.sql (create this)
  Why: Zero pricing rows = billing fails on every RPC call
  Done when: SELECT count(*) FROM rpc_method_pricing returns >= 10

TASK P1-003: Verify /rpc endpoint routes to real Polygon Amoy RPC
  File: src/services/rpc/rpc_proxy.js (audit or create)
  Why: If /rpc is a stub, no external machine can consume the network
  Done when: curl -X POST localhost:8080/rpc with eth_blockNumber returns real block number

TASK P1-004: Create /api/pricing public endpoint
  File: src/routes/api_public.js (add to existing or create)
  Why: Machines cannot auto-route here without knowing the price
  Done when: curl localhost:8080/api/pricing returns JSON with method prices

TASK P1-005: Create /api/status public endpoint  
  File: same as P1-004
  Why: Routing tools query status before trusting a provider
  Done when: curl localhost:8080/api/status returns nodes_online count

TASK P1-006: Register Node #1 in database
  File: scripts/bootstrap/register_node1.js (create this)
  Why: Zero nodes = zero capacity = cannot process any workload
  Done when: SELECT count(*) FROM registered_nodes WHERE status='active' returns >= 1
  
Commit after each task. Tag: feat(P1-00X): description
```

### Phase 2 — Send first paid workload (implement NOW)

```
TASK P2-001: Fix S0-007 billing middleware async bugs FIRST
  (Do this before sending any test workloads or the revenue won't record)
  
TASK P2-002: Create and run seed_first_workload.js
  File: scripts/bootstrap/seed_first_workload.js
  Why: Creates the first real revenue_events in the DB
  Done when: SELECT sum(cost_usdt) FROM revenue_events WHERE source='rpc_request' returns > 0
  
TASK P2-003: Run first epoch close with real data
  Done when: epoch_ledger has a finalized epoch with total_revenue > 0
  
TASK P2-004: Verify on-chain anchor exists on Polygon Amoy
  Check: Settlement batch created, Polygon tx hash in settlement_batches table
  Done when: tx_hash is not null for epoch_id = first epoch
```

### Phase 3 — External discovery (manual checklist — document only)

```
These are manual one-time actions. Do NOT automate. Do AFTER Phase 2 is done.

[ ] Deploy public RPC URL (separate VPS or Vercel edge function)
    URL format: https://rpc.satelink.network
    This URL must resolve to the /rpc endpoint
    
[ ] Submit to Chainlist: https://github.com/DefiLlama/chainlist/pulls
    PR title: "Add Satelink RPC for Polygon Amoy"
    
[ ] Submit to dRPC.org provider program
    URL: https://drpc.org/partners
    
[ ] Post to r/ethdev with public RPC URL and pricing
    Title: "Free public Polygon RPC by Satelink DePIN — 100 req/day no key needed"

Track in docs/BOOTSTRAP_CHECKLIST.md
```

### Phase 4 — First external payout (target: week 4-6)

```
TASK P4-001: Monitor external traffic in rpc_requests
  Query: SELECT ip_hash, count(*), sum(cost_usdt) 
         FROM rpc_requests 
         WHERE client_id IS NULL  -- public/unauthenticated
         GROUP BY ip_hash 
         ORDER BY count DESC;
  This shows external machines using the network
  
TASK P4-002: First external node operator onboarding
  When one external operator joins and processes a workload:
  Their wallet receives USDT → that is first real DePIN payout
  Screenshot the Polygon transaction → this is your proof of concept
  
TASK P4-003: Update PROGRESS.md milestone
  S0 → Phase 1 → Phase 2 complete
  Revenue Readiness: 60%+
```

---

## EXECUTION ORDER FOR CLAUDE CODE

When this file is executed in Claude Code, proceed in this exact order:

1. Run Section 5 audit first — understand current state
2. Fix P1-001 (SQL schema PostgreSQL compatibility)
3. Fix P1-002 (seed pricing data)
4. Verify P1-003 (/rpc endpoint real or stub)
5. Create P1-004 (/api/pricing)
6. Create P1-005 (/api/status)
7. Run P1-006 (register Node #1)
8. Create P2-002 (seed_first_workload.js — do NOT run yet)
9. Create docs/INTEGRATION_GUIDE.md
10. Create docs/BOOTSTRAP_CHECKLIST.md
11. Update agent/memory/PROGRESS.md with all P1 tasks
12. Commit: "feat(revenue-arch): P1 demand infrastructure — pricing, status, RPC endpoint, Node #1 registration"
13. STOP — do not proceed to Phase 2 until S0-007 (billing async fix) is complete
14. Update CURRENT_TASK.md → next task is S0-007 billing middleware async fix

---

## WHAT NOT TO DO (anti-patterns — reject if Claude suggests these)

- Do NOT build a marketing landing page before /rpc works
- Do NOT build a mobile app before first payout exists  
- Do NOT add more blockchain chains before Polygon Amoy has real traffic
- Do NOT raise the minimum claim back to 10 USDT before 10K daily RPC calls
- Do NOT spend time on UI/dashboard polish before billing records revenue correctly
- Do NOT implement staking, slashing, or governance before first external operator
- Do NOT add more workload types (AI, scraping) before RPC has paying clients

---

## SUCCESS METRICS (check these weekly)

| Metric | Week 1 Target | Week 4 Target | Week 8 Target |
|--------|--------------|---------------|---------------|
| Active nodes | 1 | 3 | 10 |
| Daily RPC calls | 100 (internal) | 1,000 (mixed) | 10,000 (external) |
| Daily revenue (USDT) | $0.003 | $0.30 | $3.00 |
| revenue_events rows | >0 | >1,000 | >10,000 |
| Polygon tx hashes | 0 | 1 | 4 |
| External clients | 0 | 1 | 5 |

---
# END — SATELINK REVENUE ARCHITECTURE
# Next task after this file: S0-007 (billing middleware async fix)
# Then: Phase 1 tasks P1-001 through P1-006
