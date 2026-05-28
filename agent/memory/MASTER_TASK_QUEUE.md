# MASTER TASK QUEUE — SATELINK ROTATIONAL AGENT ORG
# Generated: 2026-05-28
# Rule: ONE worker active at a time. CEO activates next only after current writes DONE.
# Model assignments: TEMPORARY — swap in Paperclip UI, no other changes needed.

---

## ROTATION RULE (mandatory — read before activating any agent)

1. Check PROGRESS.md — confirm current slot wrote DONE
2. Activate next slot's agent in Paperclip
3. Write task to that agent's task file
4. CEO heartbeat OFF — do not run again until DONE appears
5. NEVER activate 2 workers simultaneously. NEVER.

---

## SLOT 1 — BACKEND_WORKER
Status: ACTIVE
Model: Claude Sonnet 4.6 (temporary)
Max Turns: 20
Task file: agent/memory/tasks/BACKEND_TASK.md

Job: Fix auth login 404 — mount createUnifiedAuthRouter in app_factory.mjs
Exit: curl POST /login returns non-404 + git commit exists + DONE written to PROGRESS.md

---

## SLOT 2 — FRONTEND_WORKER
Status: WAITING (activates after slot 1 DONE)
Model: Claude Sonnet 4.6 (temporary)
Max Turns: 25
Task file: agent/memory/tasks/FRONTEND_TASK.md

Job: Wire admin panel with real data — apps/web/src/app/admin/*
Replace mock/hardcoded data with real API calls.
Priority order: epoch number display → node count → revenue display → conversion tracker
Exit: Admin pages show live data + DONE written to PROGRESS.md

---

## SLOT 3 — CONVERSION_MONITOR
Status: WAITING (activates after slot 2 DONE)
Model: Gemini Flash Lite (cheap — monitoring only)
Max Turns: 4
Task file: agent/memory/tasks/CONVERSION_TASK.md

Job: Poll GET https://rpc.satelink.network/system/free-tier ONCE
Write to agent/memory/CONVERSIONS.md:
  - Total IPs tracked
  - IPs at 90%+ of 500/day limit
  - IPs at 100% (need upgrade)
  - Timestamp
Exit: CONVERSIONS.md written + DONE in PROGRESS.md

---

## SLOT 4 — SENTINEL
Status: WAITING (activates after slot 3 DONE)
Model: Gemini Flash Lite (cheap — health check only)
Max Turns: 3
Task file: agent/memory/tasks/SENTINEL_TASK.md

Job: Health check — ping these endpoints:
  GET https://rpc.satelink.network/health
  GET https://rpc.satelink.network/api/status
Write status to agent/memory/SENTINEL_STATUS.md
Exit: SENTINEL_STATUS.md written + DONE in PROGRESS.md

---

## SLOT 5 — GROWTH_WORKER
Status: WAITING (activates after slot 4 DONE)
Model: Claude Sonnet 4.6 (temporary)
Max Turns: 20
Task file: agent/memory/tasks/GROWTH_TASK.md

Job: Write node operator onboarding guide
File to create: docs/NODE_OPERATOR_GUIDE.md
Contents: How to register a node, requirements, expected earnings, how to claim.
Exit: Guide committed to git + DONE in PROGRESS.md

---

## SLOT 6 — ORCHESTRATOR
Status: WAITING (activates after slot 5 DONE)
Model: Claude Sonnet 4.6 (temporary)
Max Turns: 8
Task file: agent/memory/tasks/ORCHESTRATOR_TASK.md

Job: Review all DONE entries in PROGRESS.md
Write next week's task queue to MASTER_TASK_QUEUE.md (update slots 1-6)
Write MASTER_PROGRESS.md summary
Exit: Next queue written + MASTER_PROGRESS.md updated + DONE in PROGRESS.md

---

## FUTURE SLOTS (Phase 3 — after first revenue)

SLOT 7 — DEVOPS_WORKER (Railway autoscaling, OpenObserve, Slack alerts)
SLOT 8 — REVENUE_WORKER (Mainnet USDT settlement, MEV endpoint)
SLOT 9 — SECURITY_WORKER (Trivy scan, Infisical audit, rate limit tuning)
SLOT 10 — MARKET_SCANNER (dRPC/Ankr competitor pricing — Gemini Flash Lite)
SLOT 11 — PRICING_OPTIMIZER (utilization-based price proposals — Sonnet)
SLOT 12 — NODE_RECRUITER (operator outreach copy — Gemini Flash Lite)
