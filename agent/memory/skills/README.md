# SATELINK AGENT INTELLIGENCE LAYER
# All agents read relevant files from this directory before executing tasks.

## FILES IN THIS DIRECTORY

SATELINK_COMPANY_CONTEXT.md   — What Satelink is, business model, production state
SATELINK_ARCHITECTURE.md      — Technical architecture, request flow, DB schema, contracts
SATELINK_REVENUE_MODEL.md     — Revenue mechanics, epoch lifecycle, pricing, fraud rules
AGENT_UNIVERSAL_RULES.md      — Hard rules every agent follows without exception
CODEBASE_MAP.md               — Where to find any file in the repo
DEPIN_CONCEPTS.md             — DePIN, RPC, MEV, Chainlist, Polygon, NETS explained
CURRENT_SPRINT.md             — What is happening right now, slot status, pending actions

## HOW TO USE THESE FILES

Before any task:
1. Read AGENT_UNIVERSAL_RULES.md (always)
2. Read your task file in tasks/[AGENT]_TASK.md
3. Read relevant skill files for your domain

BACKEND agents: read SATELINK_ARCHITECTURE.md + CODEBASE_MAP.md
REVENUE agents: read SATELINK_REVENUE_MODEL.md + SATELINK_ARCHITECTURE.md
GROWTH agents: read SATELINK_COMPANY_CONTEXT.md + DEPIN_CONCEPTS.md
OPS agents: read CURRENT_SPRINT.md + SATELINK_ARCHITECTURE.md
CEO: read all files before any decision

## LAST UPDATED

2026-05-29 — Initial intelligence layer created (SAT-35)
All 7 files written by CEO as foundational context for agent coordination.
