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

echo "── Environment Check ───────────────────────────────"
bash scripts/agent-env-check.sh 2>/dev/null || true
echo "────────────────────────────────────────────────────"
echo

echo "── Lint ────────────────────────────────────────────"
if has_npm_script lint; then
  run_with_timeout 25 "npm -s run lint"
else
  echo "  (no lint script configured — skipping)"
fi
echo

echo "── Tests (Smoke-first) ─────────────────────────────"
# Prefer faster scripts if they exist
if has_npm_script smoke; then
  run_with_timeout 35 "npm -s run smoke"
elif has_npm_script test:smoke; then
  run_with_timeout 35 "npm -s run test:smoke"
elif has_npm_script test; then
  run_with_timeout 35 "npm -s test"
else
  echo "  (no test script configured — skipping)"
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
