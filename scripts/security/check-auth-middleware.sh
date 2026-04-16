#!/usr/bin/env bash
# Gate 4: All /admin routes have auth middleware
set -euo pipefail
FAIL=0
echo "🔒 [GATE 4] Verifying auth middleware on admin routes..."

# Find admin route files
ADMIN_FILES=$(find src/routes/ -name "*admin*" -o -name "*control*" 2>/dev/null)

for f in $ADMIN_FILES; do
  if ! grep -q "requireAuth\|authenticate\|verifyToken\|requireRole\|middleware" "$f" 2>/dev/null; then
    echo "❌ FAIL: $f — no auth middleware detected"
    FAIL=1
  fi
done

[ $FAIL -eq 0 ] && echo "✅ PASS: Auth middleware present on admin routes" || exit 1
