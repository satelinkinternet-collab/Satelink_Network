# AGENT STATUS — ROTATIONAL MODE
# Updated: 2026-05-28
# Note: CTO agent archived (not in approved list)

## ROTATION MODEL ACTIVE
Only 1 worker runs at a time.
CEO activates next worker only after current worker writes DONE to PROGRESS.md.

---

## TIER 1 — COMMAND (Always available, not on heartbeat)
| Agent | Model (temp) | Status | Heartbeat |
|-------|-------------|--------|-----------|
| CEO | claude-sonnet-4-6 | IDLE | OFF — wake on demand |

## TIER 2 — ENGINEERING WORKERS (Rotate — 1 at a time)
| Agent | Model (temp) | Status | Current Slot |
|-------|-------------|--------|--------------|
| BACKEND_WORKER | claude-sonnet-4-6 | SLOT 1 — ACTIVE | Slot 1 |
| FRONTEND_WORKER | claude-sonnet-4-6 | WAITING | Slot 2 |
| GROWTH_WORKER | claude-sonnet-4-6 | WAITING | Slot 5 |
| ORCHESTRATOR | claude-sonnet-4-6 | WAITING | Slot 6 |

## TIER 3 — CHEAP OPS WORKERS (Gemini Flash Lite — rotate in between engineering slots)
| Agent | Model (temp) | Status | Current Slot |
|-------|-------------|--------|--------------|
| CONVERSION_MONITOR | gemini-flash-lite | WAITING | Slot 3 |
| SENTINEL | gemini-flash-lite | WAITING | Slot 4 |

---

## ARCHIVED AGENTS (not in rotation)
| Agent | Reason |
|-------|--------|
| CTO | Not in approved 7-agent list — archived 2026-05-28 |

---

## MODEL MIGRATION PATH
These are the FINAL model targets once budget scales:

| Agent | Now (temp) | Phase 2 ($100 Max) | Phase 3 ($200 Max) | Phase 4 (API) |
|-------|-----------|-------------------|-------------------|---------------|
| CEO | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 | Opus 4 |
| ORCHESTRATOR | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 |
| BACKEND_WORKER | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 |
| FRONTEND_WORKER | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 |
| GROWTH_WORKER | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 |
| CONVERSION_MONITOR | Gemini Flash Lite | Gemini Flash Lite | Gemini Flash Lite | Gemini Flash Lite |
| SENTINEL | Gemini Flash Lite | Gemini Flash Lite | Gemini Flash Lite | Gemini Flash Lite |
| DEVOPS_WORKER (future) | — | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 |
| REVENUE_WORKER (future) | — | — | Sonnet 4.6 | Sonnet 4.6 |
| MARKET_SCANNER (future) | — | — | Gemini Flash Lite | Gemini Flash Lite |
| CHIEF_ARCHITECT (future) | — | — | — | Opus 4 |

Change model: edit agent in Paperclip UI only. No file changes needed.
