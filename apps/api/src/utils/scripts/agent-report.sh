#!/usr/bin/env bash
# agent-report.sh — prints CURRENT_TASK and ROADMAP
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "════════════════════════════════════════════════════"
echo "  AGENT REPORT — $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════"
echo ""

echo "── CURRENT TASK ─────────────────────────────────────"
if [ -f "agent/memory/CURRENT_TASK.md" ]; then
  cat agent/memory/CURRENT_TASK.md
else
  echo "  (no CURRENT_TASK.md found)"
fi

echo ""
echo "── ROADMAP ──────────────────────────────────────────"
if [ -f "agent/memory/ROADMAP.md" ]; then
  cat agent/memory/ROADMAP.md
else
  echo "  (no ROADMAP.md found)"
fi

echo ""
echo "════════════════════════════════════════════════════"
