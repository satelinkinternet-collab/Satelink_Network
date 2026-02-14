#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Phase 35: Marketing Expansion Smoke Tests
# ═══════════════════════════════════════════════════════════
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"

# Auto-mint admin JWT
ADMIN_TOKEN=$(curl -s -X POST "$BASE/__test/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xSuperAdmin","role":"admin_super"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to mint admin token."
  exit 1
fi

AUTH="Authorization: Bearer $ADMIN_TOKEN"
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
echo "  Phase 35: Marketing Expansion Smoke Tests"
echo "═══════════════════════════════════════════════════"
echo ""

# Test 1: Activate region as pilot
echo "▸ Test 1: Activate region pilot"
R1=$(curl -s -X PUT "$BASE/admin/growth/regions/US-WEST" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"pilot","node_cap":10,"region_name":"US West Coast","revenue_cap_usdt_daily":500,"rewards_cap_usdt_daily":250}')
check "Region pilot" "$R1" '"ok":true' "Region activated as pilot" "Failed to activate region"

# Test 2: Check region cap enforcement
echo "▸ Test 2: Region cap check"
R2=$(curl -s "$BASE/admin/growth/regions/US-WEST/check" -H "$AUTH")
check "Region cap" "$R2" '"allowed":true' "Region allows activation" "Region check failed"

# Test 3: List regions
echo "▸ Test 3: List regions"
R3=$(curl -s "$BASE/admin/growth/regions" -H "$AUTH")
check "Regions list" "$R3" '"ok":true' "Regions listed" "Failed to list regions"

# Test 4: Register partner
echo "▸ Test 4: Register partner"
R4=$(curl -s -X POST "$BASE/admin/partners/register" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"partner_name":"TestCo","wallet":"0xPartner1","rate_limit_per_min":30,"revenue_share_percent":15}')
PARTNER_ID=$(echo "$R4" | python3 -c "import sys,json; print(json.load(sys.stdin).get('partner_id',''))" 2>/dev/null || echo "")
check "Partner register" "$R4" '"partner_id"' "Partner registered with API key" "Failed to register partner"

# Test 5: Approve partner
echo "▸ Test 5: Approve partner"
if [ -n "$PARTNER_ID" ]; then
  R5=$(curl -s -X POST "$BASE/admin/partners/approve" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"partner_id\":\"$PARTNER_ID\"}")
  check "Partner approve" "$R5" '"status":"active"' "Partner approved" "Failed to approve partner"
else
  echo "  ⏭️  Skipped (no partner_id)"
fi

# Test 6: Enable launch mode
echo "▸ Test 6: Enable launch mode"
R6=$(curl -s -X POST "$BASE/admin/launch/mode/toggle" -H "$AUTH")
check "Launch mode" "$R6" '"ok":true' "Launch mode toggled" "Failed to toggle launch mode"

# Test 7: Check launch mode status
echo "▸ Test 7: Launch mode status"
R7=$(curl -s "$BASE/admin/launch/mode" -H "$AUTH")
check "Launch status" "$R7" '"ok":true' "Launch status OK" "Failed to get launch status"

# Test 8: Disable launch mode (revert)
echo "▸ Test 8: Disable launch mode"
R8=$(curl -s -X POST "$BASE/admin/launch/mode/toggle" -H "$AUTH")
check "Launch revert" "$R8" '"ok":true' "Launch mode reverted" "Failed to revert launch mode"

# Test 9: Referral engine
echo "▸ Test 9: Referral engine"
R9=$(curl -s "$BASE/admin/growth/referrals" -H "$AUTH")
check "Referrals" "$R9" '"ok":true' "Referral data OK" "Referral engine failed"

# Test 10: Marketing dashboard
echo "▸ Test 10: Marketing dashboard"
R10=$(curl -s "$BASE/admin/growth/marketing" -H "$AUTH")
check "Marketing" "$R10" '"ok":true' "Marketing metrics OK" "Marketing dashboard failed"

# Test 11: Public /partners
echo "▸ Test 11: Public partners page"
R11=$(curl -s "$BASE/partners")
check "Public partners" "$R11" '"ok":true' "Public partners OK" "Public partners failed"

# Test 12: Partner list (admin)
echo "▸ Test 12: Partner list"
R12=$(curl -s "$BASE/admin/partners" -H "$AUTH")
check "Partners list" "$R12" '"ok":true' "Partners listed" "Partner list failed"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo "  ⚠️  FAILURES DETECTED"
  exit 2
else
  echo "  🎉 ALL PHASE 35 SMOKE TESTS PASSED"
fi
