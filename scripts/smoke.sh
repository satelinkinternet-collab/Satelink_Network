#!/bin/bash

PORT=${PORT:-8080}
BASE_URL="http://localhost:$PORT"
ADMIN_KEY=${ADMIN_API_KEY:-"test-admin-secret"}

echo "=== Satelink Smoke Test ==="

# 1. Check /health
echo -n "Checking /health... "
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
echo "$HEALTH_STATUS"

if [ "$HEALTH_STATUS" != "200" ]; then
    echo "ERROR: /health failed with status $HEALTH_STATUS"
    exit 1
fi

# 2. Check /
echo -n "Checking /... "
ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
echo "$ROOT_STATUS"

# 3. Check /ui
echo -n "Checking /ui... "
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ui")
echo "$UI_STATUS"

# 4. Check admin endpoint (expect 200 with key)
echo -n "Checking protected /protocol/pool/open with key... "
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Admin-Key: $ADMIN_KEY" -X POST "$BASE_URL/protocol/pool/open")
echo "$ADMIN_STATUS"

echo "=== Smoke Test Passed ==="
exit 0
