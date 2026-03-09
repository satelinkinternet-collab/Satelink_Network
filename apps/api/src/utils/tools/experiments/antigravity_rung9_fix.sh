#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung9_fix_verify.log"

echo "=== RUNG 9 FIX VERIFICATION ===" | tee -a $LOG_FILE

# 1. Start Server (Assuming running, but if not we can rely on manual start or previous step. Script logic usually assumes running server for curl)
# We won't restart server here to save time if it's already running, but let's check.
if ! pgrep -f "node server.js" > /dev/null; then
    echo "[0] Starting Server..."
    ./scripts/run_sandbox.sh > sandbox_9_fix.log 2>&1 &
    SERVER_PID=$!
    sleep 5
fi

# 2. Test Operator Route (Random Wallet -> Should be 200 OK now)
echo "[1] Testing Operator Route (Random Wallet)..."
WALLET="0xabc123abc123abc123"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/ui/operator/$WALLET)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: /ui/operator/$WALLET returned 200" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/operator/$WALLET returned $HTTP_CODE" | tee -a $LOG_FILE
fi

# 3. Test Distributor Route
echo "[2] Testing Distributor Route..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/ui/distributor/$WALLET)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: /ui/distributor/$WALLET returned 200" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/distributor/$WALLET returned $HTTP_CODE" | tee -a $LOG_FILE
fi

# 4. Check HTML content
echo "[3] Checking HTML Content..."
CONTENT=$(curl -s $BASE_URL/ui/operator/$WALLET | head -n 20)
if [[ $CONTENT == *"<html"* ]] || [[ $CONTENT == *"<!DOCTYPE html>"* ]]; then
    echo "PASS: Operator route returns HTML" | tee -a $LOG_FILE
else
    echo "FAIL: Operator route content suspect" | tee -a $LOG_FILE
fi

exit 0
