#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung9_2_verify.log"

echo "=== RUNG 9.2 VERIFICATION ===" | tee -a $LOG_FILE

# 1. Restart Server to apply CSP and new Styles
echo "[0] Restarting Server..."
pkill -f "node server.js" || true
sleep 2
./scripts/run_sandbox.sh > sandbox_9_2.log 2>&1 &
SERVER_PID=$!
sleep 5

# 2. Test CSP Headers
echo "[1] Testing CSP Headers..."
CSP=$(curl -s -I $BASE_URL/ui/login | grep -i "content-security-policy")
if [[ $CSP == *"script-src 'self'"* ]] && [[ $CSP != *"'unsafe-inline'"* ]]; then
    echo "PASS: Strict CSP detected (script-src 'self')" | tee -a $LOG_FILE
else
    echo "FAIL: CSP weak or missing: $CSP" | tee -a $LOG_FILE
fi

# 3. Test Assets (Local CSS)
echo "[2] Testing Local Assets..."
CSS_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/css/app.css)
if [ "$CSS_CODE" == "200" ]; then
    echo "PASS: Local CSS served (200 OK)" | tee -a $LOG_FILE
else
    echo "FAIL: Local CSS missing ($CSS_CODE)" | tee -a $LOG_FILE
fi

# 4. Content Check (No CDNs)
echo "[3] Checking View Content (No CDNs)..."
CONTENT=$(curl -s $BASE_URL/ui/login)
if echo "$CONTENT" | grep -E "cdn.tailwindcss.com|cdnjs|font-awesome"; then
    echo "FAIL: External CDN links found in login" | tee -a $LOG_FILE
else
    echo "PASS: No External CDNs on login page" | tee -a $LOG_FILE
fi

# 5. Test Export
echo "[4] Testing Export Route..."
EXPORT_TYPE=$(curl -s -I "$BASE_URL/ui/export/withdrawals" | grep "Content-Type")
if [[ $EXPORT_TYPE == *"text/csv"* ]]; then
     echo "PASS: Export returns text/csv" | tee -a $LOG_FILE
else
     echo "FAIL: Export returned: $EXPORT_TYPE" | tee -a $LOG_FILE
fi

exit 0
