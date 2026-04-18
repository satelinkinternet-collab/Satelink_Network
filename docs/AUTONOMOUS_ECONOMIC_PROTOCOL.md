# SATELINK — AUTONOMOUS ECONOMIC PROTOCOL (AEP)
# Status: FOUNDATIONAL — project is NOT complete without this layer
# Priority: P0 after billing pipeline is verified
# Last updated: April 2026

## WHAT THIS IS
Satelink is not just a DePIN node network.
It is an autonomous economic protocol — infrastructure middleware that
machines, protocols, and AI agents consume without human involvement.

Primary revenue is machine-to-machine. Human usage is welcome but never required.

## THE AUTONOMOUS REVENUE FLYWHEEL
Chainlist/registry lists RPC endpoint
  → DeFi bot/AI agent discovers autonomously
  → Machine sends calls 24/7 with no human action
  → revenue_events_v2 records every call
  → Epoch closes automatically (60s scheduler)
  → SettlementAnchorJob anchors to Polygon automatically
  → Node operators claim earnings autonomously
  → More operators join (attracted by on-chain proof)
  → More capacity → handle more machine clients
  → Loop repeats — zero human intervention ever

## DEMAND SOURCES (all machine-initiated, zero sales)

### TIER 1 — Build NOW (foundations exist)
| Source | Mechanism | Revenue Type |
|--------|-----------|--------------|
| DeFi protocols | MEV bots auto-route to cheapest RPC | Per-call, high volume |
| DEX aggregators | 1inch/Paraswap query multiple RPCs | Continuous background |
| Cross-chain bridges | LayerZero/Wormhole need RPC relay | 24/7 automated |
| On-chain oracles | Chainlink/Pyth need price feed RPC | Constant high frequency |
| DApp backends | Wallets/explorers auto-call RPC | Scales with DApp users |

### TIER 2 — Build NEXT (Stage S3)
| Source | Mechanism | Revenue Type |
|--------|-----------|--------------|
| AI agent networks | LangChain/AutoGPT use RPC as tool | Fastest growing segment |
| Keeper bots | Aave/Compound/Gelato liquidators | Automated, unstoppable |
| Blockchain indexers | The Graph/subgraphs need RPC | Constant high volume |

### TIER 3 — Build LATER (Stage S5+)
| Source | Mechanism | Revenue Type |
|--------|-----------|--------------|
| MEV private relay | Private mempool, 10-100x normal rate | Premium autonomous |
| OpenAI-compatible inference | AI pipelines call /v1/chat/completions | Per-token billing |
| Bridge validator RPC | Register as LayerZero/Wormhole provider | Protocol-level revenue |

## PROTOCOL LAYERS (all must exist for full product)

### LAYER 1 — Discovery Layer [STATUS: IN PROGRESS]
How machines find Satelink without human sales.
Required:
- [ ] Chainlist registration (PR submitted)
- [ ] dRPC provider program registration
- [ ] Ankr community endpoint registration
- [ ] Blast API partner registration
- [ ] The Graph network RPC registration
- [ ] machine-readable /api/pricing endpoint (DONE)
- [ ] machine-readable /api/status endpoint (DONE)
Files: docs/BOOTSTRAP_CHECKLIST.md

### LAYER 2 — Ingestion Layer [STATUS: DONE]
How machines send work into the network.
Required:
- [x] POST /rpc/:chain — JSON-RPC relay (DONE)
- [x] POST /gateway/rpc/amoy — public Vercel endpoint (DONE)
- [x] API key management (DONE)
- [x] Rate limiting (DONE)
- [ ] POST /rpc/mev — private mempool relay (TODO: Stage S3)
- [ ] POST /v1/chat/completions — AI inference proxy (TODO: Stage S3)
- [ ] POST /proxy — bandwidth proxy (TODO: Stage S5)
- [ ] POST /scrape — web scraping (TODO: Stage S5)
Files: apps/api/src/workloads/rpc_gateway/

### LAYER 3 — Billing Layer [STATUS: VERIFIED]
How every machine action generates revenue atomically.
Required:
- [x] rpc_method_pricing table with 25 methods (DONE)
- [x] global_gateway_router._recordRevenue() (DONE)
- [x] Cache hits billed (edge_cache source) (DONE)
- [x] revenue_events_v2 as source of truth (DONE)
- [x] Railway billing verified — 122+ events, $0.0366 USDT (DONE)
- [ ] MEV premium pricing tier (TODO)
- [ ] AI inference per-token billing (TODO)
Files: apps/api/src/gateway/global/global_gateway_router.js

### LAYER 4 — Settlement Layer [STATUS: PARTIAL]
How revenue becomes on-chain USDT automatically.
Required:
- [x] epoch_ledger with 50/30/20 split (DONE)
- [x] SettlementAnchorJob → Polygon tx (DONE)
- [x] settlement_batches table (DONE)
- [x] Real Polygon Amoy tx confirmed (DONE)
- [ ] Mainnet USDT settlement (TODO: Stage S9)
- [ ] Multi-chain settlement (Ethereum, Arbitrum) (TODO: Stage S8)
- [ ] Merkle root anchoring for audit proof (TODO: Stage S7)
Files: apps/api/src/scheduler/jobs/settlement_anchor_job.js

### LAYER 5 — Node Supply Layer [STATUS: PARTIAL]
How compute/bandwidth supply scales autonomously.
Required:
- [x] Node registry (DONE)
- [x] NODE-SATELINK-001 registered (DONE)
- [ ] External node onboarding flow (TODO: Stage S1)
- [ ] Node reputation scoring (TODO: Stage S2)
- [ ] Geographic routing (TODO: Stage S2)
- [ ] GPU node support for AI inference (TODO: Stage S3)
- [ ] Residential IP nodes for scraping (TODO: Stage S5)
Files: apps/api/src/services/

### LAYER 6 — Protocol Registry Layer [STATUS: IN PROGRESS]
How Satelink registers itself in machine-readable directories.
This is the ONLY human action required — done once, autonomous forever.
Required:
- [x] Chainlist PR submitted (April 19, 2026) — awaiting merge
- [x] dRPC provider registration submitted (April 19, 2026)
- [ ] Ankr registration
- [ ] Blast API registration
- [ ] awesome-rpc GitHub listing
- [ ] LayerZero RPC provider registration (Stage S8)
- [ ] Wormhole guardian RPC registration (Stage S8)
Files: docs/BOOTSTRAP_CHECKLIST.md

### LAYER 7 — Autonomous Operations Layer [STATUS: PARTIAL]
How the system runs without human intervention.
Required:
- [x] Epoch auto-close scheduler (DONE)
- [x] SettlementAnchorJob auto-runs (DONE)
- [x] Revenue Sentinel (5 modules) (DONE)
- [ ] Auto-scaling node selection (TODO: Stage S6)
- [ ] Self-healing RPC failover (TODO: Stage S2)
- [ ] Autonomous pricing adjustment (TODO: Stage S6)
Files: apps/api/src/sentinel/, apps/api/src/scheduler/

### LAYER 8 — DeFi/DApp Integration Layer [STATUS: NOT STARTED]
How DeFi protocols use Satelink as infrastructure.
Required:
- [ ] EIP-1193 compliant provider interface
- [ ] WebSocket RPC support (eth_subscribe)
- [ ] MEV private relay endpoint (POST /rpc/mev)
- [ ] Flashbots-compatible bundle endpoint
- [ ] DApp SDK (@satelink/sdk npm package)
- [ ] Wagmi/ethers.js provider adapter
Files: (new) apps/api/src/workloads/defi_gateway/

### LAYER 9 — AI Agent Integration Layer [STATUS: NOT STARTED]
How AI agents use Satelink as autonomous infrastructure.
Required:
- [ ] OpenAI-compatible endpoint (POST /v1/chat/completions)
- [ ] LangChain tool adapter
- [ ] AutoGPT plugin manifest
- [ ] Per-token billing in revenue_events_v2
- [ ] GPU node routing
Files: (new) apps/api/src/workloads/ai_gateway/

## COMPETITIVE DIFFERENTIATION (why machines choose Satelink)
1. On-chain settlement proof — DeFi protocols trust on-chain over centralized billing
2. Distributed residential nodes — MEV bots avoid known datacenter IPs
3. Programmable revenue splits — revenue-sharing RPC impossible on AWS
4. Price — 30-50% cheaper than Alchemy/Infura at scale
5. Workload types refused by centralized providers — scraping, automation, grey-area ops

## REVENUE PROJECTION (machine-only, zero human sales)
| Month | Primary Driver | Daily Calls | Monthly Revenue |
|-------|---------------|-------------|-----------------|
| May 2026 | Chainlist discovery | 1K-10K | $10-$100 |
| Jun 2026 | DeFi bots | 10K-100K | $100-$1,000 |
| Jul 2026 | MEV endpoint | 100K-500K | $1,000-$5,000 |
| Aug 2026 | AI agent endpoint | 500K-2M | $5,000-$20,000 |
| Oct 2026 | Bridge integrations | 2M+ | $20,000+ |

## DEFINITION OF DONE (full product)
Project is NOT complete until ALL of these are true:
- [ ] All 9 protocol layers have STATUS: DONE
- [ ] At least 3 machine clients sending autonomous traffic
- [ ] Epoch closes with >0 revenue without any human action
- [ ] SettlementAnchorJob runs without human trigger
- [ ] At least 1 external node operator receiving automatic payouts
- [ ] Chainlist + dRPC + Ankr all registered
- [ ] MEV endpoint live and billing
- [ ] AI inference endpoint live and billing
- [ ] Mainnet USDT settlement confirmed

## IMPLEMENTATION PRIORITY ORDER
1. LAYER 3 fix (billing on Railway) ← CURRENT
2. LAYER 6 (Chainlist + registries) ← NEXT
3. LAYER 5 (external node onboarding)
4. LAYER 8 (DeFi/MEV gateway)
5. LAYER 9 (AI agent gateway)
6. LAYER 2 completion (MEV + inference endpoints)
7. LAYER 4 completion (mainnet settlement)
