# Bug Log

## BUG-001: Agent scripts only existed in .claude/worktrees
* Date: 2026-02-22
* Status: Fixed
* Symptom: agent-report.sh not found in repo root scripts/
* Fix: Copied agent-*.sh from .claude/worktrees into scripts/ and made executable.

## BUG-002: CURRENT_TASK.md missing from repo root
* Date: 2026-02-22
* Status: Fixed
* Symptom: agent-report.sh could not read agent memory files
* Fix: Created agent/memory/ directory with all brain files.

## BUG-003: .claude/worktrees appearing in git status
* Date: 2026-02-22
* Status: Fixed
* Fix: Added .claude/ to .gitignore and untracked via git rm --cached.
