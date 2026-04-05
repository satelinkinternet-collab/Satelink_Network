# Architecture Decisions

## ADR-001: Agent scripts live in scripts/ (not .claude/worktrees)
* Date: 2026-02-22
* Status: Accepted
* Reason: .claude/ is Claude Code internal tooling; scripts must be version-controlled in the repo root for team access and CI integration.

## ADR-002: .claude/ excluded from git via .gitignore
* Date: 2026-02-22
* Status: Accepted
* Reason: Claude worktrees are ephemeral and local; tracking them pollutes git status and diffs.

## ADR-003: agent/memory/ for persistent agent state
* Date: 2026-02-22
* Status: Accepted
* Reason: Gives the agentic workflow a durable brain across sessions without touching business logic.
