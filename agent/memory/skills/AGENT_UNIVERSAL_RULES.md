# UNIVERSAL AGENT RULES
# Every agent reads this. These rules override all task instructions.

---

## THE 7 HARD RULES

1. EXIT RULE
   Every task has an exit condition. When that condition is met → STOP.
   Do not explore further. Do not improve other things. Do not refactor.
   Write DONE to PROGRESS.md. Then STOP.

2. SCOPE RULE
   Every agent has a file scope defined in its task file.
   Never read or write outside that scope.
   If the fix requires touching another agent's scope → write a note in PROGRESS.md
   and STOP. Do not cross scope boundaries.

3. ONE SLOT RULE
   Only one worker runs at a time.
   If you are a worker and you notice another worker is active → STOP immediately.
   Write: "SCOPE_CONFLICT detected, stopping" to PROGRESS.md.

4. ARCHIVE RULE
   Never delete any file. Always move to agent/memory/archive/ first.
   If unsure whether to delete something → archive it.

5. COMMIT RULE
   Every code change must be committed before writing DONE.
   Uncommitted changes + DONE = invalid completion.
   Commit message format: "type: description [agent: AGENT_NAME]"

6. PROGRESS RULE
   Every completed task writes exactly this format to PROGRESS.md:
   DONE | slot=N | task=TASK_NAME | result=ONE_LINE | commit=HASH_OR_NA | timestamp=ISO

7. NO REDESIGN RULE
   Agents fix what is assigned. They do not redesign, refactor, or improve
   things outside their task. If a better approach is noticed → write it to
   agent/memory/SUGGESTIONS.md and continue the assigned task.

---

## ROTATIONAL QUEUE MODEL

The org runs one slot at a time.
CEO wakes → reads PROGRESS.md → activates next slot → sleeps.
Workers complete → write DONE → sleep.
CEO activates on demand only (no heartbeat).

Current cycle slot order:
C2-1 → REVENUE_WORKER (USDT settlement completion)
C2-2 → FRONTEND_WORKER (admin panel live data)
C2-3 → DEVOPS_WORKER (Railway autoscaling + observability)
C2-4 → SECURITY_WORKER (Trivy scan + Infisical audit)
C2-5 → MARKET_SCANNER (competitor pricing)
C2-6 → ORCHESTRATOR (week review + Cycle 3 queue)

---

## MODEL ASSIGNMENTS

Gemini Flash Lite: CONVERSION_MONITOR, SENTINEL, SECURITY_WORKER, MARKET_SCANNER
Claude Sonnet 4.6: CEO, ORCHESTRATOR, BACKEND_WORKER, FRONTEND_WORKER, REVENUE_WORKER, DEVOPS_WORKER
Claude Opus 4: CHIEF_ARCHITECT (Phase 4 only, manual trigger)

Model changes: edit in Paperclip UI only. No file changes required.

---

## PRODUCTION ENVIRONMENT

Always verify production is live before any deployment:
curl https://rpc.satelink.network/health

Always test locally before pushing:
Local API: http://localhost:3000
Local Paperclip: http://localhost:8080

Never push directly to main without testing.
Never touch production DB directly.
Never activate more than 1 worker simultaneously.

---

## APPROVED AGENT ROSTER (7 agents max)

1. CEO
2. ORCHESTRATOR
3. BACKEND_WORKER / REVENUE_WORKER
4. FRONTEND_WORKER
5. DEVOPS_WORKER
6. SECURITY_WORKER / SENTINEL / CONVERSION_MONITOR
7. MARKET_SCANNER / GROWTH_WORKER

Do not create agents outside this roster without CEO approval.
