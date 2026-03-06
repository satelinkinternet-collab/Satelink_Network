#!/bin/bash
# scripts/agent-check.sh
#
# Usage:
#   AGENT_MODE=fast  bash scripts/agent-check.sh   # default: smoke only
#   AGENT_MODE=full  bash scripts/agent-check.sh   # lint + tests (hard-fail) + audits (soft-fail)
#
# Exit codes:
#   0  — all hard checks passed (soft-fail items may have warned)
#   1  — at least one hard check (lint or core tests) failed in full mode

set -euo pipefail

ts()     { date "+%Y-%m-%d %H:%M:%S"; }
hr()     { echo "────────────────────────────────────────────────────"; }

banner() {
  echo "════════════════════════════════════════════════════"
  echo "  AGENT CHECK — $(ts)"
  echo "  MODE: ${AGENT_MODE:-fast}"
  echo "════════════════════════════════════════════════════"
  echo
}

# Run a command with an optional timeout.
# Prefers gtimeout (coreutils), then macOS timeout, then falls back to raw exec.
# Accepts: run_with_timeout <seconds> <cmd...>
run_with_timeout() {
  local seconds="$1"; shift
  local cmd="$*"

  echo "  ▶ Running (timeout ${seconds}s): $cmd"
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "${seconds}" bash -lc "$cmd"
  elif command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}" bash -lc "$cmd"
  else
    echo "  ⚠️  No timeout command found. Install coreutils: brew install coreutils"
    bash -lc "$cmd"
  fi
}

# Soft-fail wrapper: always returns 0, but prints a warning on non-zero exit.
# Use for audits and optional checks that should not block the build.
run_soft() {
  local label="$1"; shift
  local seconds="$1"; shift
  local cmd="$*"

  echo "  ▶ [soft-fail] $label (timeout ${seconds}s): $cmd"
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "${seconds}" bash -lc "$cmd" || true
  elif command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}" bash -lc "$cmd" || true
  else
    bash -lc "$cmd" || true
  fi
}

has_npm_script() {
  node -e "
    const p = require('./package.json');
    process.exit((p.scripts && p.scripts['$1']) ? 0 : 1);
  " 2>/dev/null
}

# ── SETUP ────────────────────────────────────────────────────────────────────

banner
AGENT_MODE="${AGENT_MODE:-fast}"

# Track whether any hard check failed (full mode only)
HARD_FAIL=0

# ── CURRENT TASK (informational) ─────────────────────────────────────────────

hr
echo "── Current Task"
hr
if [ -f agent/memory/CURRENT_TASK.md ]; then
  sed -n '1,20p' agent/memory/CURRENT_TASK.md
else
  echo "  (no agent/memory/CURRENT_TASK.md found)"
fi
echo

# ── ENV CHECK (soft-fail — may not exist on all setups) ──────────────────────

hr
echo "── Environment Check (soft-fail)"
hr
if [ -f scripts/agent-env-check.sh ]; then
  bash scripts/agent-env-check.sh 2>/dev/null || true
else
  echo "  (scripts/agent-env-check.sh not found — skipping)"
fi
echo

# ── LINT (hard-fail in full mode, soft-fail in fast mode) ────────────────────

hr
echo "── Lint"
hr
if has_npm_script lint; then
  if [ "$AGENT_MODE" = "full" ]; then
    # Hard-fail: lint errors block the check
    run_with_timeout 25 "npm -s run lint" || {
      echo "  ❌ Lint FAILED"
      HARD_FAIL=1
    }
  else
    # Fast mode: lint is informational only
    run_soft "lint" 25 "npm -s run lint"
  fi
else
  echo "  (no lint script configured — skipping)"
fi
echo

# ── TESTS ─────────────────────────────────────────────────────────────────────

hr
echo "── Tests [mode: ${AGENT_MODE}]"
hr
if [ "$AGENT_MODE" = "full" ]; then
  # Full mode: core test suite is a hard-fail
  if has_npm_script test; then
    run_with_timeout 90 "npm -s test" || {
      echo "  ❌ Core tests FAILED"
      HARD_FAIL=1
    }
  else
    echo "  (no test script configured — skipping)"
  fi
else
  # Fast mode: smoke only — fail fast on import/syntax errors but soft on runtime
  run_with_timeout 20 "bash scripts/agent-smoke.sh"
fi
echo

# ── SECURITY SCAN (always soft-fail — labeled explicitly) ────────────────────

hr
echo "── Security Scan [soft-fail]"
hr
if [ -f SECURITY_TEST.sh ]; then
  run_soft "security-scan" 40 "bash SECURITY_TEST.sh"
else
  echo "  (SECURITY_TEST.sh not found — skipping)"
fi
echo

# ── NPM AUDIT (always soft-fail — labeled explicitly) ────────────────────────

hr
echo "── NPM Audit [soft-fail]"
hr
run_soft "npm-audit" 25 "npm -s audit --audit-level=high"
echo

# ── RESULT ───────────────────────────────────────────────────────────────────

hr
if [ "$HARD_FAIL" -eq 1 ]; then
  echo "❌ AGENT CHECK FAILED — one or more hard checks did not pass."
  echo "   (soft-fail items like audit/security are excluded from this determination)"
  exit 1
else
  echo "✅ AGENT CHECK DONE — all hard checks passed."
  if [ "$AGENT_MODE" = "full" ]; then
    echo "   (soft-fail items — audit/security — may still have warnings above)"
  fi
fi
