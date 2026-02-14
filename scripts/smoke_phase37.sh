#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Phase 37: Silent Embedded Wallet Auth Smoke Tests
# ═══════════════════════════════════════════════════════════
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
PASS=0
FAIL=0

check() {
  local name="$1" body="$2" pattern="$3"
  echo -n "▸ $name: "
  if echo "$body" | grep -q "$pattern"; then
    echo "  ✅ $4"
    PASS=$((PASS+1))
  else
    echo "  ❌ $5 — Response: $body"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Phase 37: Embedded Wallet Auth"
echo "═══════════════════════════════════════════════════"
echo ""

# Test 1: Start Auth (Get Nonce)
echo "▸ Test 1: Start Auth"
R1=$(curl -s -X POST "$BASE/auth/embedded/start" \
  -H "Content-Type: application/json" \
  -d '{"address":"0xTestDeviceWallet"}')
check "Auth Start" "$R1" '"ok":true' "Nonce generated" "Auth start failed"

# Test 2: Verify message template
check "Message Template" "$R1" '"message_template"' "Template present" "Missing template"

# Test 3: Logout
echo "▸ Test 3: Logout"
R3=$(curl -s -X POST "$BASE/auth/embedded/logout")
check "Logout" "$R3" '"ok":true' "Logout OK" "Logout failed"

# Test 4: Rate limit check (spam start)
echo "▸ Test 4: Rate limit check"
for i in {1..25}; do
  R4=$(curl -s -X POST "$BASE/auth/embedded/start" \
    -H "Content-Type: application/json" \
    -d '{"address":"0xRateLimitTest"}')
done
check "Rate Limit" "$R4" 'Too many login attempts' "Rate limit active" "Rate limit failed to trigger"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  # Rate limit test might fail if IP is already limited from previous runs, 
  # but here we focus on verifying functionality.
  echo "  ⚠️  SOME TESTS FAILED"
  exit 2
else
  echo "  🎉 PHASE 37 BACKEND TESTS PASSED"
fi
