#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung10b_verify.log"

echo "=== RUNG 10b VERIFICATION ===" | tee -a $LOG_FILE

# 1. Restart Server to load new routes
echo "[0] Restarting Server..."
pkill -f "node server.js" || true
sleep 2
./scripts/run_sandbox.sh > sandbox_10b.log 2>&1 &
SERVER_PID=$!
sleep 5

# 2. Check UI Routes
echo "[1] Checking Builder UI Routes..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/ui/builder/login)
if [ "$CODE" == "200" ]; then
    echo "PASS: /ui/builder/login accessible (200)" | tee -a $LOG_FILE
else
    echo "FAIL: /ui/builder/login returned $CODE" | tee -a $LOG_FILE
fi

# 3. Run Simulation Logic (Node script)
echo "[2] Running Simulation (Auth -> Project -> Usage)..."
node scripts/simulate_builder.cjs | tee -a $LOG_FILE

# 4. Verify DB Records
echo "[3] Verifying Database Records..."
# Check for usage record
USAGE_COUNT=$(sqlite3 satelink.db "SELECT COUNT(*) FROM api_usage")
if [ "$USAGE_COUNT" -gt 0 ]; then
    echo "PASS: api_usage table populated ($USAGE_COUNT rows)" | tee -a $LOG_FILE
else
    echo "FAIL: api_usage empty" | tee -a $LOG_FILE
fi

# Check for revenue event
REV_COUNT=$(sqlite3 satelink.db "SELECT COUNT(*) FROM revenue_events WHERE provider='Builder'")
if [ "$REV_COUNT" -gt 0 ]; then
     echo "PASS: Builder revenue event recorded ($REV_COUNT rows)" | tee -a $LOG_FILE
else
     echo "FAIL: No Builder revenue events found" | tee -a $LOG_FILE
fi

echo "=== RUNG 10b COMPLETE ===" | tee -a $LOG_FILE
exit 0
