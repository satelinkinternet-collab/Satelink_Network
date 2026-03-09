#!/bin/bash
# SECURITY_TEST.sh
# Verifies Input Validation & Auth Hardening

API_URL="http://localhost:8080"
echo "🔥 Starting Security Hardening Test..."

# 1. Get Builder Token (for usage API)
BUILDER_TOKEN=$(curl -s -X POST $API_URL/__test/auth/builder/login -H "Content-Type: application/json" -d '{"wallet":"0xbuilder_sec"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')
echo "✅ Got Builder Token"

# TEST 1: Count Limit (Max 100)
echo "[TEST 1] Testing Max Count Limit (Should FAIL with 400)..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/builder-api/usage \
  -H "Authorization: Bearer $BUILDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"op_type":"test_op", "count": 101}')

if [ "$CODE" == "400" ]; then
    echo "✅ PASS: Rejected count=101 (HTTP 400)"
else
    echo "❌ FAIL: Accepted count=101 (HTTP $CODE)"
    exit 1
fi

# TEST 2: Invalid op_type
echo "[TEST 2] Testing Invalid op_type (Should FAIL with 400)..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/builder-api/usage \
  -H "Authorization: Bearer $BUILDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"op_type": 123, "count": 1}')

if [ "$CODE" == "400" ]; then
    echo "✅ PASS: Rejected invalid op_type (HTTP 400)"
else
    echo "❌ FAIL: Accepted invalid op_type (HTTP $CODE)"
    exit 1
fi

# TEST 3: Admin Auth without Token (Should FAIL with 401 if key missing)
# Note: This might pass if ADMIN_API_KEY env is set and matches defaults, but we try with BAD key
echo "[TEST 3] Testing Bad Admin Key (Should FAIL with 401)..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/admin/users \
  -H "x-admin-key: BAD_KEY")

if [ "$CODE" == "401" ]; then
    echo "✅ PASS: Rejected bad admin key (HTTP 401)"
else
    echo "❌ FAIL: Accepted bad admin key (HTTP $CODE)"
    exit 1
fi

echo "✅ All Security Tests Passed."
