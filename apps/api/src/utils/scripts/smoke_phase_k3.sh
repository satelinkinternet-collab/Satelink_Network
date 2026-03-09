#!/bin/bash
set -e
API_URL="http://localhost:8080"
echo "Phase K3 Smoke Test: Query Budget"

# 1. Login as Admin
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/__test/auth/admin/login" -H "Content-Type: application/json" -d '{"wallet":"0xsmokeK3"}' | jq -r '.token')
if [ "$ADMIN_TOKEN" == "null" ]; then echo "❌ Admin login failed"; exit 1; fi

# 2. Trigger Slow Query (Simulated via DB manually or just assume logic works?)
# We can't easily force a slow query on a small DB without a 'SELECT sleep(1)' which SQLite lacks.
# But we can check if the code runs.
# We will check if 'slow_queries' table exists and is queryable.
echo "Checking Slow Queries table..."
# We can use the admin system endpoint if we add a query tool, but we don't have one.
# So we use the runtime/retention endpoint which queries counts.
RETENTION=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/admin/system/retention")
SLOW_COUNT=$(echo "$RETENTION" | jq -r '.counts.slow_queries')

if [ "$SLOW_COUNT" == "null" ]; then
    echo "❌ Failed to query slow_queries count: $RETENTION"
    exit 1
fi
echo "✅ Slow Queries table accessible (Count: $SLOW_COUNT)"

# 3. Verify Server is still up
HEALTH=$(curl -s "$API_URL/health" | jq -r '.service')
if [ "$HEALTH" == "satelink" ]; then
    echo "✅ Server Healthy"
else
    echo "❌ Server Unhealthy"
    exit 1
fi
