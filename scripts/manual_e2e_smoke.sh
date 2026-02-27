#!/bin/bash

# Configuration
PORT=${PORT:-8080}
BASE_URL="http://localhost:$PORT"
ADMIN_KEY=${ADMIN_API_KEY:-"satelink-admin-secret"}
LOG_FILE="logs/manual_smoke.log"

echo "=== Satelink Manual E2E Smoke Test ==="

# 1. Kill any existing process on PORT
echo "Cleaning up port $PORT..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true

# 2. Start server
echo "Starting server on port $PORT..."
mkdir -p logs
PORT=$PORT node server.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "Server started (PID: $SERVER_PID)"

# 3. Wait for boot
sleep 2

# 4. Verification
echo "--- Verification ---"

check_endpoint() {
    local name=$1
    local path=$2
    local expected=$3
    echo -n "Checking $name ($path)... "
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    echo "Status: $status"
    if [ "$status" != "$expected" ]; then
        echo "ERROR: Expected $expected but got $status"
        kill -9 $SERVER_PID
        exit 1
    fi
}

check_endpoint "Health" "/health" "200"
check_endpoint "Home" "/" "200"
check_endpoint "UI Dashboard" "/ui" "200"

echo "--- First lines of responses ---"
curl -s "$BASE_URL/health" | head -n 1
echo ""
curl -s "$BASE_URL/" | head -n 10
echo ""

# 5. Clean up
echo "Stopping server (PID: $SERVER_PID)..."
kill -9 $SERVER_PID
rm -f server.pid

echo "=== Smoke Test PASSED ==="
exit 0
