#!/usr/bin/env bash
# Gate 4: All /admin routes have auth middleware (inline or mount-level)
set -euo pipefail
FAIL=0
echo "🔒 [GATE 4] Verifying auth middleware on admin routes..."

ROUTES_FILE="apps/api/src/gateway/routes.js"

# Find admin route files (routes are in apps/api/src/gateway/routes/)
ADMIN_FILES=$(find apps/api/src/gateway/routes/ -name "*admin*" -o -name "*control*" 2>/dev/null)

for f in $ADMIN_FILES; do
  BASENAME=$(basename "$f" .js)

  # Check 1: Inline auth keywords in the route file
  if grep -qE "requireAuth|authenticate|verifyToken|requireRole|req\.user\?" "$f" 2>/dev/null; then
    continue
  fi

  # Check 2: Mount-level auth in routes.js (requireAdmin/requireJWT before the router)
  # Extract router function name from file (e.g., createAdminRevenueRouter)
  ROUTER_FN=$(grep -oE "create[A-Za-z]+Router" "$f" 2>/dev/null | head -1)
  if [ -n "$ROUTER_FN" ] && grep -qE "requireAdmin.*$ROUTER_FN|requireJWT.*$ROUTER_FN" "$ROUTES_FILE" 2>/dev/null; then
    continue
  fi

  echo "❌ FAIL: $f — no auth middleware detected (inline or mount-level)"
  FAIL=1
done

[ $FAIL -eq 0 ] && echo "✅ PASS: Auth middleware present on admin routes" || exit 1
