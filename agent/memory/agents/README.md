# SATELINK AGENT ROSTER
# Intelligence files for all 7 agents.

## COMMAND LAYER
CEO/INSTRUCTIONS.md          — Queue manager, milestone gatekeeper
ORCHESTRATOR/INSTRUCTIONS.md — Sprint reviewer, next-cycle planner

## ENGINEERING WORKERS (Claude Sonnet — rotate 1 at a time)
BACKEND_WORKER/INSTRUCTIONS.md  — API + services + DB
FRONTEND_WORKER/INSTRUCTIONS.md — Next.js dashboard + admin panel
GROWTH_WORKER/INSTRUCTIONS.md   — Docs + operator guides + developer content

## OPS WORKERS (Gemini Flash Lite — cheap, fast)
CONVERSION_MONITOR/INSTRUCTIONS.md — Free tier → paid conversion tracking
SENTINEL/INSTRUCTIONS.md           — Production health monitoring

## HOW AGENTS USE THESE FILES

Each agent reads its INSTRUCTIONS.md before executing any task.
Instructions define: identity, decision framework, what agent owns, what it must never do.

Combined with skills/ directory (project-wide context), agents have complete
autonomous decision-making capability for their domain.

## UPGRADING AGENT INTELLIGENCE

When agent consistently makes wrong decisions → update its INSTRUCTIONS.md.
When project architecture changes → update relevant files in skills/.
ORCHESTRATOR updates CURRENT_SPRINT.md each Sunday.
CEO updates AGENT_STATUS.md when slot changes.
