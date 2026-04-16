#!/usr/bin/env bash
# Gate 3: No SQLite imports anywhere in src/
set -euo pipefail
FAIL=0
echo "🔒 [GATE 3] Scanning for SQLite usage..."

if grep -rn "better-sqlite3\|sqlite3\|\.sqlite\|SQLITE" src/ scripts/ --include="*.js" --include="*.ts" 2>/dev/null | grep -v "//\|#.*sqlite\|\.db-shm\|\.db-wal"; then
  echo "❌ FAIL: SQLite reference found — PostgreSQL only"
  FAIL=1
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No SQLite usage found" || exit 1
