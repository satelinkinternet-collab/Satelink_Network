#!/usr/bin/env bash
# agent-check.sh — prints CURRENT_TASK, runs env check, lint, tests, npm audit
# Lint and tests are non-blocking initially; audit warns but does not fail.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

EXIT_CODE=0

echo "════════════════════════════════════════════════════"
echo "  AGENT CHECK — $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════"
echo ""

# ── 1. Current Task ──────────────────────────────────────
echo "── Current Task ────────────────────────────────────"
if [ -f "agent/memory/CURRENT_TASK.md" ]; then
  # Print the first task line (non-blank, non-heading)
  grep -m1 "^##\? " agent/memory/CURRENT_TASK.md || head -5 agent/memory/CURRENT_TASK.md
else
  echo "  (no CURRENT_TASK.md found)"
fi
echo ""

# ── 2. Environment Check ─────────────────────────────────
bash "$REPO_ROOT/scripts/agent-env-check.sh" || true
echo ""

# ── 3. Lint (non-blocking) ───────────────────────────────
echo "── Lint ─────────────────────────────────────────────"
if [ -f "package.json" ] && node -e "const p=JSON.parse(require('fs').readFileSync('package.json')); process.exit(p.scripts&&p.scripts.lint?0:1)" 2>/dev/null; then
  npm run lint --if-present 2>&1 || echo "  ⚠️  Lint warnings/errors (non-blocking)"
else
  echo "  (no lint script configured — skipping)"
fi
echo ""

# ── 4. Tests (non-blocking) ──────────────────────────────
echo "── Tests ────────────────────────────────────────────"
if [ -f "package.json" ] && node -e "const p=JSON.parse(require('fs').readFileSync('package.json')); process.exit(p.scripts&&p.scripts.test?0:1)" 2>/dev/null; then
  echo "  Running: npm test (non-blocking)"
  npm test 2>&1 | tail -20 || echo "  ⚠️  Tests failed (non-blocking in scaffold phase)"
else
  echo "  (no test script configured — skipping)"
fi
echo ""

# ── 5. npm audit (warn only) ─────────────────────────────
echo "── Security Audit ───────────────────────────────────"
if [ -f "package-lock.json" ]; then
  npm audit --audit-level=high 2>&1 | tail -10 || echo "  ⚠️  Audit found issues (non-blocking)"
else
  echo "  (no package-lock.json — skipping audit)"
fi
echo ""

echo "════════════════════════════════════════════════════"
echo "  Agent check complete. Exit code: $EXIT_CODE"
echo "════════════════════════════════════════════════════"
exit $EXIT_CODE
