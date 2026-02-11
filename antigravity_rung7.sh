#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung7_verify.log"
ADMIN_KEY="admin-secret"

# Ensure clean slate
echo "[0] Killing old servers..."
pkill -f "node server.js" || true
sleep 2

# Start Server
echo "[0] Starting Server..."
./scripts/run_sandbox.sh > sandbox_7.log 2>&1 &
SERVER_PID=$!
sleep 5

echo "=== RUNG 7 VERIFICATION ===" | tee -a $LOG_FILE

# 1. Admin Auth Check (Fail)
echo "[1] Testing Unauthorized Admin Access..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/admin)
if [ "$HTTP_CODE" == "401" ]; then
    echo "PASS: Admin 401 Unauthorized" | tee -a $LOG_FILE
else
    echo "FAIL: Admin access code $HTTP_CODE" | tee -a $LOG_FILE
fi

# 2. Admin Auth Check (Success)
echo "[2] Testing Authorized Admin Access..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "x-admin-key: $ADMIN_KEY" $BASE_URL/admin)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: Admin 200 Authorized" | tee -a $LOG_FILE
else
    echo "FAIL: Admin authorized code $HTTP_CODE" | tee -a $LOG_FILE
fi

# 3. Logs Access
echo "[3] Testing Logs Access..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "x-admin-key: $ADMIN_KEY" $BASE_URL/logs)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: Logs accessible" | tee -a $LOG_FILE
else
    echo "FAIL: Logs access code $HTTP_CODE" | tee -a $LOG_FILE
fi

# 4. Trigger Error & Verify Log
echo "[4] Triggering Test Error..."
curl -s $BASE_URL/__test/error || true
sleep 1
# Fetch logs and grep for error msg
LOG_CONTENT=$(curl -s -H "x-admin-key: $ADMIN_KEY" $BASE_URL/logs)
if echo "$LOG_CONTENT" | grep -q "Simulated Crash"; then
    echo "PASS: Error Logged in DB and visible in UI" | tee -a $LOG_FILE
else
    echo "FAIL: Error log not found in UI" | tee -a $LOG_FILE
fi

# 5. Diagnostics Share Token
echo "[5] Testing Diagnostics..."
# Generate Token
RESP=$(curl -s -X POST -H "x-admin-key: $ADMIN_KEY" $BASE_URL/diag/share)
TOKEN=$(echo $RESP | jq -r '.token')

if [ "$TOKEN" != "null" ]; then
    echo "PASS: Diag Token Generated: $TOKEN" | tee -a $LOG_FILE
    
    # Use Token
    SNAPSHOT=$(curl -s "$BASE_URL/diag/snapshot?token=$TOKEN")
    echo "SNAPSHOT RAW: $SNAPSHOT" | tee -a $LOG_FILE
    
    # Check if snapshot is valid JSON
    if echo "$SNAPSHOT" | jq . > /dev/null 2>&1; then
         DB_STATUS=$(echo "$SNAPSHOT" | jq -r '.db.ok')
         if [ "$DB_STATUS" == "true" ]; then
             echo "PASS: Diagnostic Snapshot Retrieved & Valid" | tee -a $LOG_FILE
         else
             echo "FAIL: Accessing snapshot with token ($DB_STATUS)" | tee -a $LOG_FILE
         fi
    else
         echo "FAIL: Snapshot is not valid JSON" | tee -a $LOG_FILE
    fi
else
    echo "FAIL: Generating token" | tee -a $LOG_FILE
fi

echo "=== VERIFICATION COMPLETE ===" | tee -a $LOG_FILE

# Cleanup
kill $SERVER_PID || true
exit 0
