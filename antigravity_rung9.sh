#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung9_verify.log"
ADMIN_KEY="admin-secret"
COOKIE_FILE="cookies.txt"

# Ensure cleanup
rm -f $COOKIE_FILE

echo "=== RUNG 9 VERIFICATION ===" | tee -a $LOG_FILE

# 1. Start Server (if not running, but for this script we assume running or we start it)
# We will just test against localhost:8080 assuming previous step left it clean or running.
# Let's restart to be sure.
echo "[0] Restarting Server..."
pkill -f "node server.js" || true
sleep 2
./scripts/run_sandbox.sh > sandbox_9.log 2>&1 &
SERVER_PID=$!
sleep 5

# 2. Test Auth Protection (No Cookie)
echo "[1] Test Protected Route (No Cookie)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/ui/admin)
if [ "$HTTP_CODE" == "302" ] || [ "$HTTP_CODE" == "401" ]; then
    echo "PASS: /ui/admin redirect/protected ($HTTP_CODE)" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/admin accessible without cookie ($HTTP_CODE)" | tee -a $LOG_FILE
fi

# 3. Test Login Flow (Get Cookie)
echo "[2] performing Login..."
curl -s -c $COOKIE_FILE -X POST -d "apiKey=$ADMIN_KEY" $BASE_URL/ui/login
# Check if cookie file has content
if grep -q "admin_session" $COOKIE_FILE; then
    echo "PASS: Login successful, cookie set" | tee -a $LOG_FILE
else
    echo "FAIL: Login failed, no cookie" | tee -a $LOG_FILE
    cat $COOKIE_FILE
fi

# 4. Test Protected Route (With Cookie)
echo "[3] Test Protected Route (With Cookie)..."
HTTP_CODE=$(curl -s -b $COOKIE_FILE -o /dev/null -w "%{http_code}" $BASE_URL/ui/admin)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: /ui/admin accessible with cookie" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/admin failed with cookie ($HTTP_CODE)" | tee -a $LOG_FILE
fi

# 5. Test Ledger Route
HTTP_CODE=$(curl -s -b $COOKIE_FILE -o /dev/null -w "%{http_code}" $BASE_URL/ui/admin/ledger)
if [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: /ui/admin/ledger accessible" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/admin/ledger failed ($HTTP_CODE)" | tee -a $LOG_FILE
fi

# 6. Test Public Operator Route
echo "[4] Test Operator Route..."
# Need a valid wallet or just random? The route checks DB.
# Let's create a node first via API or just use a random one and expect 404 handled gracefully?
# Route returns 404 template if not found, which is 404 status.
# Let's verify it doesn't crash.
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/ui/operator/0x123)
if [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "200" ]; then
    echo "PASS: /ui/operator handled gracefully ($HTTP_CODE)" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/operator/0x123 crashed or strange ($HTTP_CODE)" | tee -a $LOG_FILE
fi

# Cleanup
kill $SERVER_PID || true
rm -f $COOKIE_FILE sandbox_9.log
exit 0
