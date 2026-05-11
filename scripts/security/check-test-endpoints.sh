#!/usr/bin/env bash
# Gate 2: No __test routes in production-eligible code
set -euo pipefail
FAIL=0
echo "🔒 [GATE 2] Scanning for __test endpoints in production code..."

if grep -rn "__test\|/simulation\|/seed\|/mock-login" src/routes/ src/server.js --include="*.js" --include="*.ts" 2>/dev/null | grep -v "NODE_ENV.*test\|if.*test\|process\.env"; then
  echo "❌ FAIL: Unguarded __test or simulation route found in production code"
  FAIL=1
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No unguarded test endpoints found" || exit 1
