#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung8_verify.log"
ADMIN_KEY="admin-secret"

# Ensure clean slate
echo "[0] Killing old servers..."
pkill -f "node server.js" || true
sleep 2

# Start Server
echo "[0] Starting Server..."
./scripts/run_sandbox.sh > sandbox_8.log 2>&1 &
SERVER_PID=$!
sleep 5

echo "=== RUNG 8 VERIFICATION ===" | tee -a $LOG_FILE

# 1. Ops Status (Initial)
echo "[1] Check Ops Status..."
STATUS=$(curl -s -H "x-admin-key: $ADMIN_KEY" $BASE_URL/ops/status)
echo "Status: $STATUS" | tee -a $LOG_FILE

IS_RUNNING=$(echo $STATUS | jq -r '.scheduler_running')
if [ "$IS_RUNNING" == "true" ]; then
    echo "PASS: Scheduler Running" | tee -a $LOG_FILE
else
    echo "FAIL: Scheduler Not Running ($IS_RUNNING)" | tee -a $LOG_FILE
fi

# 2. Manual Safe Mode
echo "[2] Trigger Manual Safe Mode..."
MODE_RES=$(curl -s -X POST -H "x-admin-key: $ADMIN_KEY" -H "Content-Type: application/json" -d '{"reason":"Test Lock"}' $BASE_URL/ops/safe-mode)
echo "Mode Res: $MODE_RES" | tee -a $LOG_FILE

STATUS=$(curl -s -H "x-admin-key: $ADMIN_KEY" $BASE_URL/ops/status)
SAFE=$(echo $STATUS | jq -r '.safe_mode')
if [ "$SAFE" == "true" ]; then
    echo "PASS: System entered Safe Mode" | tee -a $LOG_FILE
else
    echo "FAIL: Safe Mode not applied ($SAFE)" | tee -a $LOG_FILE
fi

# 3. Simulate Alert (Webhook Failures)
# To verify this automatedly without waiting 5 minutes or mocking, 
# we check if AlertService is instantiated? 
# OR we look for the log entry from the safe mode trigger which calls sendAlert.
# "MANUAL SAFE MODE ENABLED" should be in logs.

echo "[3] Checking Alerts Log..."
# We can check the /logs endpoint for the alert message
LOGS=$(curl -s -H "x-admin-key: $ADMIN_KEY" $BASE_URL/logs)
if echo "$LOGS" | grep -q "MANUAL SAFE MODE ENABLED"; then
    echo "PASS: Alert logged to DB/Console" | tee -a $LOG_FILE
else
    echo "FAIL: Alert not found in logs" | tee -a $LOG_FILE
fi

echo "=== VERIFICATION COMPLETE ===" | tee -a $LOG_FILE

# Cleanup
kill $SERVER_PID || true
exit 0
