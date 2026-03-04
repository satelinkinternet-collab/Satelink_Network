#!/bin/bash
set -euo pipefail

# Configuration
PORT=${PORT:-3000}
BASE_URL=${BASE_URL:-"http://localhost:${PORT}"}
LOG_FILE="/tmp/satelink_e2e_server.log"
ADMIN_KEY=${ADMIN_API_KEY:-"test-admin-secret"}
RUN_MOCHA=${RUN_MOCHA:-1}

echo "--- Satelink Manual E2E Runner ---"

# Cleanup function
cleanup() {
    if [ -n "${SERVER_PID:-}" ]; then
        echo "Shutting down server (PID: ${SERVER_PID})..."
        kill "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# Start server
echo "Starting server on port ${PORT}..."
echo "Logs: ${LOG_FILE}"
npm run start > "${LOG_FILE}" 2>&1 &
SERVER_PID=$!

# Wait for readiness
echo "Waiting for server to be ready at ${BASE_URL}/health..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s "${BASE_URL}/health" | grep -q '{"ok":true}'; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: Server failed to become ready after ${MAX_RETRIES} seconds."
        echo "Last 200 lines of ${LOG_FILE}:"
        tail -n 200 "${LOG_FILE}"
        exit 1
    fi
    sleep 1
done
echo "Server is ready."

# HTTP Checks
echo "Running HTTP checks..."

check_status() {
    local method=$1
    local url=$2
    local expected=$3
    local header=$4
    local data=${5:-""}
    
    echo "Checking ${method} ${url} (Expected: ${expected})..."
    
    local cmd="curl -s -o /dev/null -w \"%{http_code}\" -X ${method} \"${BASE_URL}${url}\""
    if [ -n "${header}" ]; then
        cmd="${cmd} -H \"${header}\""
    fi
    if [ -n "${data}" ]; then
        cmd="${cmd} -d '${data}' -H 'Content-Type: application/json'"
    fi
    
    local status
    status=$(eval "${cmd}")
    
    if [ "${status}" != "${expected}" ]; then
        echo "FAILURE: Expected ${expected}, got ${status}"
        echo "Last 200 lines of ${LOG_FILE}:"
        tail -n 200 "${LOG_FILE}"
        exit 1
    fi
}

# 1. POST /ledger/epoch/finalize WITHOUT admin key => expect 401
check_status "POST" "/ledger/epoch/finalize" "401" ""

# 2. POST /ledger/epoch/finalize WITH admin key => expect 200
check_status "POST" "/ledger/epoch/finalize" "200" "X-Admin-Key: ${ADMIN_KEY}"

# 3. POST /protocol/pool/open WITHOUT key => expect 401
check_status "POST" "/protocol/pool/open" "401" ""

# 4. POST /registry/sync WITHOUT key => expect 401
check_status "POST" "/registry/sync" "401" ""

# 5. POST /heartbeat with VALID signed payload => expect 200
echo "Generating signed heartbeat..."
PAYLOAD=$(node scripts/heartbeat_signer.mjs)
echo "Payload: ${PAYLOAD}"
check_status "POST" "/heartbeat" "200" "" "${PAYLOAD}"

# Optional Mocha Tests
if [ "${RUN_MOCHA}" -eq 1 ]; then
    echo "Running Mocha E2E tests..."
    if ! npx mocha --timeout 15000 test/Security.test.js test/Heartbeat.test.js; then
        echo "Mocha tests FAILED."
        echo "Last 200 lines of ${LOG_FILE}:"
        tail -n 200 "${LOG_FILE}"
        exit 1
    fi
fi

echo "-----------------------------------"
echo "PASS: Manual E2E checks completed successfully."
echo "-----------------------------------"
