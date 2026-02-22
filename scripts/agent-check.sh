#!/bin/bash
set -e

ts() { date "+%Y-%m-%d %H:%M:%S"; }

banner() {
  echo "════════════════════════════════════════════════════"
  echo "  AGENT CHECK — $(ts)"
  echo "════════════════════════════════════════════════════"
  echo
}

run_with_timeout() {
  local seconds="$1"; shift
  local cmd="$*"

  echo "  Running (timeout ${seconds}s): $cmd"
  # Use gtimeout if installed (coreutils), else use macOS timeout if available, else run without timeout
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "${seconds}" bash -lc "$cmd" || true
  elif command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}" bash -lc "$cmd" || true
  else
    echo "  ⚠️  No timeout command found. Install coreutils for gtimeout: brew install coreutils"
    bash -lc "$cmd" || true
  fi
}

has_npm_script() {
  node -e "const p=require('./package.json'); process.exit((p.scripts&&p.scripts['$1'])?0:1)" 2>/dev/null
}

banner

echo "── Current Task ────────────────────────────────────"
if [ -f agent/memory/CURRENT_TASK.md ]; then
  sed -n '1,120p' agent/memory/CURRENT_TASK.md
else
  echo "  (no CURRENT_TASK.md found)"
fi
echo

bash scripts/agent-env-check.sh 2>/dev/null || true
echo

echo "── Lint ────────────────────────────────────────────"
if has_npm_script lint; then
  run_with_timeout 25 "npm -s run lint"
else
  echo "  (no lint script configured — skipping)"
fi
echo

AGENT_MODE="${AGENT_MODE:-fast}"
echo "── Tests [mode: ${AGENT_MODE}] ─────────────────────"
if [ "$AGENT_MODE" = "full" ]; then
  if has_npm_script test; then
    run_with_timeout 90 "npm -s test"
  else
    echo "  (no test script configured — skipping)"
  fi
else
  run_with_timeout 20 "bash scripts/agent-smoke.sh"
fi
echo

echo "── Security (non-blocking) ─────────────────────────"
if [ -f SECURITY_TEST.sh ]; then
  run_with_timeout 40 "bash SECURITY_TEST.sh"
else
  echo "  (SECURITY_TEST.sh not found — skipping)"
fi

echo
echo "── NPM Audit (non-blocking) ────────────────────────"
run_with_timeout 25 "npm -s audit --audit-level=high"
echo

echo "✅ AGENT CHECK DONE"
