#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Phase 34 — Revenue & Growth Smoke Tests
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"

# Auto-mint admin JWT via dev auth
ADMIN_TOKEN=$(curl -s -X POST "$BASE/__test/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xSuperAdmin","role":"admin_super"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to mint admin token. Is the server running at $BASE?"
  exit 1
fi

AUTH="Authorization: Bearer $ADMIN_TOKEN"
PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Phase 34: Revenue & Growth Engine Smoke Tests"
echo "═══════════════════════════════════════════════════"
echo ""

# ── 1. Update Pricing Rule ───────────────────────────────────
echo "▸ Test 1: Update pricing rule"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/admin/revenue/pricing/update" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"op_type":"inference","base_price_usdt":0.0002,"surge_enabled":true,"surge_threshold":500,"surge_multiplier":1.5}')
CODE=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
if [ "$CODE" = "200" ]; then
  AUDITED=$(echo "$BODY" | grep -o '"audited":true' || true)
  if [ -n "$AUDITED" ]; then ok "Pricing updated + audited"; else fail "Update OK but audit missing"; fi
else fail "Pricing update returned $CODE"; fi

# ── 2. Read Pricing Rules ────────────────────────────────────
echo "▸ Test 2: Read pricing rules"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/revenue/pricing" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
if [ "$CODE" = "200" ]; then ok "Pricing rules readable"; else fail "Pricing GET returned $CODE"; fi

# ── 3. Revenue Stats (24h) ──────────────────────────────────
echo "▸ Test 3: Revenue stats"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/revenue/stats" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
if [ "$CODE" = "200" ]; then
  HAS_SURGE=$(echo "$BODY" | grep -o '"avg_surge"' || true)
  if [ -n "$HAS_SURGE" ]; then ok "Stats with surge metrics"; else fail "Stats missing surge_ops"; fi
else fail "Stats returned $CODE"; fi

# ── 4. Node Profitability Rank ───────────────────────────────
echo "▸ Test 4: Node profitability"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/revenue/profitability" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
if [ "$CODE" = "200" ]; then ok "Profitability endpoint OK"; else fail "Profitability returned $CODE"; fi

# ── 5. Unit Economics ─────────────────────────────────────────
echo "▸ Test 5: Unit economics (7d)"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/revenue/unit-economics?period=7d" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
if [ "$CODE" = "200" ]; then
  HAS_BEV=$(echo "$BODY" | grep -o '"break_even_node_count"' || true)
  if [ -n "$HAS_BEV" ]; then ok "Unit economics with break-even"; else fail "Missing break_even_node_count"; fi
else fail "Unit economics returned $CODE"; fi

# ── 6. Distributor Commission Accrual ────────────────────────
echo "▸ Test 6: Commission accrual"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/revenue/commissions" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
if [ "$CODE" = "200" ]; then ok "Commission endpoint OK"; else fail "Commissions returned $CODE"; fi

# ── 7. Distributor Performance Page ──────────────────────────
echo "▸ Test 7: Distributor performance"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/distributors/performance" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
if [ "$CODE" = "200" ]; then ok "Distributor performance OK"; else fail "Distributor perf returned $CODE"; fi

# ── 8. Public Network Stats ──────────────────────────────────
echo "▸ Test 8: Public /network-stats"
RES=$(curl -s -w "\n%{http_code}" "$BASE/network-stats")
CODE=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
if [ "$CODE" = "200" ]; then
  HAS_UPTIME=$(echo "$BODY" | grep -o '"uptime_24h_pct"' || true)
  HAS_OPS=$(echo "$BODY" | grep -o '"total_operations_24h"' || true)
  if [ -n "$HAS_UPTIME" ] && [ -n "$HAS_OPS" ]; then
    ok "Network stats with uptime + ops"
  else fail "Network stats missing fields"; fi
else fail "Network stats returned $CODE"; fi

# ── 9. Public /status (alias) ────────────────────────────────
echo "▸ Test 9: Public /status"
RES=$(curl -s -w "\n%{http_code}" "$BASE/status")
CODE=$(echo "$RES" | tail -1)
if [ "$CODE" = "200" ]; then ok "/status endpoint active"; else fail "/status returned $CODE"; fi

# ── 10. Acquisition Tracker ──────────────────────────────────
echo "▸ Test 10: Acquisition analytics"
RES=$(curl -s -w "\n%{http_code}" "$BASE/admin/revenue/acquisition" -H "$AUTH")
CODE=$(echo "$RES" | tail -1)
if [ "$CODE" = "200" ]; then ok "Acquisition analytics OK"; else fail "Acquisition returned $CODE"; fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && echo "  🎉 ALL PHASE 34 SMOKE TESTS PASSED" || echo "  ⚠️  FAILURES DETECTED"
echo ""
exit $FAIL
