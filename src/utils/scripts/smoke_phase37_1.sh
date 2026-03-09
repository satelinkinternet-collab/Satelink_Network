#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Phase 37.1: Production Survivability Smoke Tests
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
echo "  Phase 37.1: Production Survivability"
echo "═══════════════════════════════════════════════════"
echo ""

# Test 1: Address Spam Protection (from failure telemetry phase)
echo "▸ Test 1: Address Spam Protection"
for i in {1..7}; do
  R1=$(curl -s -X POST "$BASE/auth/embedded/start" \
    -H "Content-Type: application/json" \
    -d "{\"address\":\"0xSpamAddress$i\"}")
done
check "Address Spam" "$R1" 'Too many unique addresses' "Blocked after 5+ unique addresses" "Spam block failed"

# Test 2: Support Ticket Submission
echo "▸ Test 2: Support Ticket Submission"
R2=$(curl -s -X POST "$BASE/support/ticket" \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xTestUser", "message":"Test problem", "bundle_json":{"app_version":"1.0.0"}}')
check "Ticket Submit" "$R2" '"ok":true' "Ticket accepted" "Ticket submission failed"

# Test 3: Admin Ticket View
echo "▸ Test 3: Admin Ticket View"
R3=$(curl -s -X GET "$BASE/admin/support/tickets")
check "Admin Tickets (Protected)" "$R3" '"ok":false' "Auth protection active" "Admin ticket endpoint exposed"

# Admin Login for following tests
echo "▸ Admin Login for Self-Tests"
ADMIN_TOKEN=$(curl -s -X POST "$BASE/__test/auth/admin/login" -H "Content-Type: application/json" -d '{"wallet":"0xadmin"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

# Test 4: Verify migration applied (Self-test endpoint)
echo "▸ Test 4: Self-Test Support Table"
R4=$(curl -s -X POST "$BASE/admin/diagnostics/self-tests/run" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"support_bundle_redaction"}')
check "Self-Test Redaction" "$R4" '"status":"pass"' "Support table and redaction logic verified" "Self-test failed"

# Test 5: Verify Silent Reauth Contract
echo "▸ Test 5: Self-Test Silent Reauth"
R5=$(curl -s -X POST "$BASE/admin/diagnostics/self-tests/run" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"silent_reauth_contract"}')
check "Self-Test Reauth" "$R5" '"status":"pass"' "Re-auth contract verified" "Re-auth self-test failed"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 2
else
  echo "  🎉 PHASE 37.1 VERIFICATION PASSED"
fi
