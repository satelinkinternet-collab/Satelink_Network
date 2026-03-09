#!/bin/bash
set -e
API_URL="http://localhost:8080"
echo "Phase K Smoke Test: Hardening"

# 1. Login as Admin
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/__test/auth/admin/login" -H "Content-Type: application/json" -d '{"wallet":"0xsmokeK"}' | jq -r '.token')
if [ "$ADMIN_TOKEN" == "null" ]; then echo "❌ Admin login failed"; exit 1; fi

# 2. Check DB Health
echo "Checking DB Health..."
DB_HEALTH=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/admin/system/database")
WAL_STATUS=$(echo "$DB_HEALTH" | jq -r '.wal.status')
PAGES=$(echo "$DB_HEALTH" | jq -r '.pages.total')

if [ "$WAL_STATUS" == "null" ] || [ "$PAGES" == "null" ]; then
    echo "❌ DB Health failed: $DB_HEALTH"
    exit 1
fi
echo "✅ DB Health OK (Pages: $PAGES, WAL Status: $WAL_STATUS)"

# 3. Check Runtime Metrics
echo "Checking Runtime Metrics..."
# We might not have history yet if it runs every 60s, but we should have 'current'
RUNTIME=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/admin/system/runtime")
HEAP=$(echo "$RUNTIME" | jq -r '.current.heap_mb')

if [ "$HEAP" == "null" ]; then
    echo "❌ Runtime Metrics failed: $RUNTIME"
    exit 1
fi
echo "✅ Runtime Metrics OK (Heap: ${HEAP}MB)"

echo "✅ Phase K1/K2 Smoke Test Passed"
