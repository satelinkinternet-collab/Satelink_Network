# MASTER TASK QUEUE — SATELINK PRODUCTION
# Started: 2026-05-28T00:00:00Z
# Budget: Claude Pro (5 days) → $100 Max → $200 Max → API billing
# Rule: ONE slot active at a time. CEO reads PROGRESS.md before activating next slot.

---

## ROTATION LAW
1. CEO wakes (on demand only)
2. Read PROGRESS.md — find latest DONE entry
3. If slot N is DONE → activate slot N+1
4. Write slot N+1 agent's task file
5. Activate that agent in Paperclip
6. CEO writes action to PROGRESS.md
7. CEO STOPS — does not run again until next DONE appears

NEVER activate 2 workers simultaneously. NEVER run CEO on a heartbeat.

---

## SLOT 1 — BACKEND_WORKER
Agent: BACKEND_WORKER
Model: claude-sonnet-4-6 (temporary)
Max Turns: 20
Status: ACTIVE
Task: Fix auth 404 — mount createUnifiedAuthRouter in app_factory.mjs
File scope: apps/api/src/app_factory.mjs · apps/api/src/routes/node_auth_route.mjs
Exit: curl /auth/login returns non-404 + commit + DONE in PROGRESS.md

---

## SLOT 2 — FRONTEND_WORKER
Agent: FRONTEND_WORKER
Model: claude-sonnet-4-6 (temporary)
Max Turns: 25
Status: WAITING — activates after Slot 1 DONE
Task: Wire admin panel with real API data
  Priority 1: Replace hardcoded epoch number → GET /api/status
  Priority 2: Replace hardcoded node count → GET /admin/nodes or /api/nodes
  Priority 3: Replace hardcoded revenue → GET /admin/revenue
  Priority 4: Add conversion tracker → GET /system/free-tier (show near-limit count)
File scope: apps/web/src/app/admin/* · apps/web/src/app/dashboard/*
Exit: Pages show live data + committed + DONE in PROGRESS.md

---

## SLOT 3 — CONVERSION_MONITOR
Agent: CONVERSION_MONITOR
Model: gemini-2.5-flash-lite (cheap — monitoring only)
Max Turns: 4
Status: WAITING — activates after Slot 2 DONE
Task: One-shot free tier status check
  Run: curl https://rpc.satelink.network/system/free-tier
  Write report to: agent/memory/CONVERSIONS.md
  Report fields: total IPs, near-limit count (90%+), at-limit count (100%)
Exit: CONVERSIONS.md written + DONE in PROGRESS.md

---

## SLOT 4 — SENTINEL
Agent: SENTINEL
Model: gemini-2.5-flash-lite (cheap — health check only)
Max Turns: 3
Status: WAITING — activates after Slot 3 DONE
Task: One-shot production health check
  Ping: /health · /api/status
  Write: agent/memory/SENTINEL_STATUS.md
Exit: SENTINEL_STATUS.md written + DONE in PROGRESS.md

---

## SLOT 5 — GROWTH_WORKER
Agent: GROWTH_WORKER
Model: claude-sonnet-4-6 (temporary)
Max Turns: 20
Status: WAITING — activates after Slot 4 DONE
Task: Write node operator onboarding guide
  File: docs/NODE_OPERATOR_GUIDE.md
  Contents: registration, heartbeat, earnings, claims, support
Exit: Guide committed + DONE in PROGRESS.md

---

## SLOT 6 — ORCHESTRATOR
Agent: ORCHESTRATOR
Model: claude-sonnet-4-6 (temporary)
Max Turns: 8
Status: WAITING — activates after Slot 5 DONE
Task: Week 1 review + write next cycle queue
  Read all DONE entries in PROGRESS.md
  Write: agent/memory/MASTER_PROGRESS.md (completion summary)
  Update: MASTER_TASK_QUEUE.md (next cycle slots 1-6)
Exit: MASTER_PROGRESS.md written + queue updated + DONE in PROGRESS.md

---

## CYCLE 2 — SLOTS 1–6
# Activated: 2026-05-29T06:00:00Z
# Revenue-first ordering based on Cycle 1 risk flags.

---

## SLOT C2-1 — REVENUE_WORKER
Agent: REVENUE_WORKER
Model: claude-sonnet-4-6
Max Turns: 20
Status: ACTIVE — activate after ORCHESTRATOR writes Cycle 1 DONE
Task: Mainnet USDT settlement completion
  - Identify settlement contract / payout mechanism
  - Complete or unblock the revenue loop
  - Confirm at least one USDT payout path is functional
Exit: Revenue path documented or unblocked + DONE in PROGRESS.md

---

## SLOT C2-EMERGENCY — BACKEND_WORKER
Agent: BACKEND_WORKER
Model: claude-sonnet-4-6
Max Turns: 20
Status: ACTIVE — emergency priority due to Railway healthcheck failure
Task: Investigate and fix Railway deployment crash
  - Read railway-crash.log (if available) or check recent logs
  - Identify why healthcheck is failing (check server startup, DB connections, port binding)
  - Restore /health to ok:true
Exit: /health returns ok + DONE in PROGRESS.md

---

## SLOT C2-2 — FRONTEND_WORKER
Agent: FRONTEND_WORKER
Model: claude-sonnet-4-6
Max Turns: 20
Status: WAITING — activates after C2-EMERGENCY DONE
Task: Verify and fix admin panel live-data wiring (Cycle 1 Slot 2 unverified)
  - Confirm each endpoint returns real data: /api/status, /admin/nodes, /admin/revenue, /system/free-tier
  - Fix any hardcoded values still present
  - Commit verified state
Exit: All four endpoints confirmed live + committed + DONE in PROGRESS.md

---

## SLOT C2-3 — DEVOPS_WORKER
Agent: DEVOPS_WORKER
Model: claude-sonnet-4-6
Max Turns: 20
Status: WAITING — activates after C2-2 DONE
Task: Railway autoscaling + OpenObserve setup
  - Configure Railway autoscaling rules for API service
  - Set up OpenObserve (or equivalent) log ingestion
  - Document config in docs/DEVOPS_RUNBOOK.md
Exit: Autoscaling active + observability ingesting logs + DONE in PROGRESS.md

---

## SLOT C2-4 — SECURITY_WORKER
Agent: SECURITY_WORKER
Model: gemini-2.5-flash-lite
Max Turns: 8
Status: WAITING — activates after C2-3 DONE
Task: Trivy full scan + Infisical audit
  - Run Trivy against all container images
  - Audit Infisical secret access logs
  - Write report to: agent/memory/SECURITY_REPORT.md
Exit: SECURITY_REPORT.md written + DONE in PROGRESS.md

---

## SLOT C2-5 — MARKET_SCANNER
Agent: MARKET_SCANNER
Model: gemini-2.5-flash-lite
Max Turns: 4
Status: WAITING — activates after C2-4 DONE
Task: Competitor pricing check
  - Survey top 3 competitors' RPC/compute pricing
  - Compare vs Satelink current rates
  - Write report to: agent/memory/MARKET_SCAN.md
Exit: MARKET_SCAN.md written + DONE in PROGRESS.md

---

## SLOT C2-6 — ORCHESTRATOR
Agent: ORCHESTRATOR
Model: claude-sonnet-4-6
Max Turns: 8
Status: WAITING — activates after C2-5 DONE
Task: Week 2 review + write Cycle 3 queue
  - Read all DONE entries in PROGRESS.md
  - Write: agent/memory/MASTER_PROGRESS.md (append Cycle 2 summary)
  - Update: MASTER_TASK_QUEUE.md (Cycle 3 slots 1–6)
Exit: Summary appended + Cycle 3 queue written + DONE in PROGRESS.md

---

## UPCOMING SLOTS (Phase 3 — after first revenue confirmed)
Slot C3+  — PRICING_OPTIMIZER — Utilization-based price proposals (Cycle 3)
Slot C3+  — NODE_RECRUITER    — Operator outreach copy (Gemini Flash Lite, Cycle 3)
Slot C3+  — CHIEF_ARCHITECT   — Architecture review (Opus, manual activation)

---

## MODEL MIGRATION (change in Paperclip UI only — no file changes)
Current → $100 Max → $200 Max → API billing
Gemini Flash Lite agents stay Gemini forever (ops/monitoring)
Sonnet agents stay Sonnet until Opus budget available
Opus = CHIEF_ARCHITECT + ECONOMIC_STRATEGIST (Phase 4 only, manual)

---

## CYCLE 3 — SLOTS (Node Operator Acquisition Focus)
# Created: 2026-05-29T14:15:00Z
# Priority: Get first node operator online → first revenue

---

## SLOT C3-1 — DEVOPS_WORKER
Agent: DEVOPS_WORKER
Model: claude-sonnet-4-6
Max Turns: 20
Status: WAITING — activate next
Task: Railway autoscaling + observability setup
  - Configure Railway autoscaling rules for API service
  - Set up log ingestion (OpenObserve or equivalent)
  - Document config in docs/DEVOPS_RUNBOOK.md
Exit: Autoscaling active + logs ingesting + DONE in PROGRESS.md

---

## SLOT C3-2 — SECURITY_WORKER
Agent: SECURITY_WORKER
Model: gemini-2.5-flash-lite
Max Turns: 8
Status: WAITING — after C3-1 DONE
Task: Trivy scan + Infisical audit
  - Run Trivy against container images
  - Audit Infisical secret access logs
  - Write report to: agent/memory/SECURITY_REPORT.md
Exit: SECURITY_REPORT.md written + DONE in PROGRESS.md

---

## SLOT C3-3 — BACKEND_WORKER
Agent: BACKEND_WORKER
Model: claude-sonnet-4-6
Max Turns: 20
Status: WAITING — after C3-2 DONE
Task: Node registration flow end-to-end test
  - Register a test node via POST /api/nodes/register
  - Confirm heartbeat endpoint works: POST /api/nodes/heartbeat
  - Confirm node appears as 'online' in GET /api/status
  - Fix any blocking issues in the registration flow
Exit: One node registered + online + DONE in PROGRESS.md

---

## SLOT C3-4 — CONVERSION_MONITOR
Agent: CONVERSION_MONITOR
Model: gemini-2.5-flash-lite
Max Turns: 4
Status: WAITING — after C3-3 DONE
Task: Free-tier conversion check
  - curl https://rpc.satelink.network/stats/free-tier
  - Compare to previous: 82 IPs, 0 at-limit
  - Write update to: agent/memory/CONVERSIONS.md
Exit: CONVERSIONS.md updated + DONE in PROGRESS.md

---

## SLOT C3-5 — SENTINEL
Agent: SENTINEL
Model: gemini-2.5-flash-lite
Max Turns: 3
Status: WAITING — after C3-4 DONE
Task: Health check + node count verify
  - Ping /health and /api/status
  - Verify nodes_online reflects C3-3 registration
  - Write: agent/memory/SENTINEL_STATUS.md
Exit: SENTINEL_STATUS.md updated + DONE in PROGRESS.md

---

## SLOT C3-6 — ORCHESTRATOR
Agent: ORCHESTRATOR
Model: claude-sonnet-4-6
Max Turns: 8
Status: WAITING — after C3-5 DONE
Task: Cycle 3 review + Cycle 4 queue
  - Read all DONE entries
  - Append Cycle 3 summary to MASTER_PROGRESS.md
  - Write Cycle 4 slots (revenue verification focus)
Exit: Summary appended + Cycle 4 queue written + DONE in PROGRESS.md

---

## BLOCKING (tracks across cycles)
SAT-8: Chainlist PR — HUMAN ACTION REQUIRED
  File: docs/chainlist_mainnet_pr.md
  Submit to: github.com/ethereum-lists/chains
  This is the highest-leverage single action remaining for organic discovery.
