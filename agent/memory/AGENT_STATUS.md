# AGENT STATUS — PRODUCTION ROTATIONAL MODE
# Updated: 2026-05-28T00:00:00Z
# Law: One worker runs at a time. CEO activates next only after DONE appears in PROGRESS.md.

## COMMAND LAYER
CEO              | claude-sonnet-4-6      | IDLE — wake on demand
ORCHESTRATOR     | claude-sonnet-4-6      | WAITING — Slot 6

## ENGINEERING WORKERS (rotate one at a time)
BACKEND_WORKER   | claude-sonnet-4-6      | SLOT 1 — ACTIVE NOW
FRONTEND_WORKER  | claude-sonnet-4-6      | SLOT 2 — WAITING
GROWTH_WORKER    | claude-sonnet-4-6      | SLOT 5 — WAITING

## OPS WORKERS (Gemini — cheap, fast)
CONVERSION_MONITOR | gemini-2.5-flash-lite | SLOT 3 — WAITING
SENTINEL           | gemini-2.5-flash-lite | SLOT 4 — WAITING
