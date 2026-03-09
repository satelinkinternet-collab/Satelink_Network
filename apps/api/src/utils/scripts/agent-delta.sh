#!/usr/bin/env bash
# agent-delta.sh — prints git status, diff stat, and last commits
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "════════════════════════════════════════════════════"
echo "  AGENT DELTA — $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════"
echo ""

echo "── Branch ──────────────────────────────────────────"
git branch --show-current
echo ""

echo "── Git Status ──────────────────────────────────────"
git status --short
echo ""

echo "── Diff Stat (staged + unstaged) ───────────────────"
git diff --stat HEAD 2>/dev/null || echo "(no diff vs HEAD)"
echo ""

echo "── Last 5 Commits ──────────────────────────────────"
git log --oneline -5
echo ""

echo "════════════════════════════════════════════════════"
