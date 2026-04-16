#!/usr/bin/env bash
# Smoke test — run after deploy to verify system is alive
set -euo pipefail
API_URL="${API_URL:-http://localhost:8080}"
FAIL=0

echo "💨 Running Satelink smoke tests against $API_URL"

check() {
  local name="$1"
  local url="$2"
  local expected="$3"
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  if [ "$response" = "$expected" ]; then
    echo "  ✅ $name ($response)"
  else
    echo "  ❌ $name — expected $expected, got $response"
    FAIL=1
  fi
}

check "Health endpoint" "$API_URL/health" "200"
check "API mode" "$API_URL/api/mode" "200"
check "Test route blocked" "$API_URL/__test/auth/login" "403"
check "Simulation route blocked" "$API_URL/simulation/status" "403"
check "Unauthenticated admin blocked" "$API_URL/api/admin/stats" "401"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "✅ ALL SMOKE TESTS PASSED"
else
  echo ""
  echo "❌ SMOKE TESTS FAILED — triggering rollback"
  exit 1
fi
