#!/bin/bash
set -e
API_URL="http://localhost:8080"
echo "Phase K7 Smoke Test: Stress Tester"

# 1. Login
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/__test/auth/admin/login" -H "Content-Type: application/json" -d '{"wallet":"0xsmokeK7"}' | jq -r '.token')
if [ "$ADMIN_TOKEN" == "null" ]; then echo "❌ Login failed"; exit 1; fi

# 2. Trigger Stress Test (Read Heavy, 5s)
echo "Triggering Stress Test..."
RESULT=$(curl -s -X POST "$API_URL/admin/system/stress/run" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"read_heavy", "duration":2, "concurrency":2}')

echo "Result: $RESULT"

# Check if result contains ops_count
OPS=$(echo "$RESULT" | jq -r '.ops_count')

if [ "$OPS" != "null" ] && [ "$OPS" -gt "0" ]; then
    echo "✅ Stress Test Completed. Ops: $OPS"
else
    echo "❌ Stress Test Failed or No Ops recorded."
    exit 1
fi

# 3. Check History
echo "Checking History..."
HIST=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/admin/system/stress/history")
COUNT=$(echo "$HIST" | jq '. | length')

if [ "$COUNT" -gt "0" ]; then
    echo "✅ History retrieved ($COUNT runs)"
else
    echo "❌ History empty"
    exit 1
fi
