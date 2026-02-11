#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung5b_abuse.log"
DB_PATH="satelink.db"

# Setup Env
if [ -f .env.sandbox ]; then
    export $(grep -v '^#' .env.sandbox | xargs)
fi
# Force Secret for Test Script consistency if missing
export MOONPAY_WEBHOOK_SECRET=${MOONPAY_WEBHOOK_SECRET:-test_secret_abc}

echo "=== RUNG 5B: ABUSE & FAILURE SIMULATION ===" | tee -a $LOG_FILE

# 0. Start Server
echo "[0] Killing old servers..." | tee -a $LOG_FILE
pkill -f "node server.js" || true
sleep 2

echo "[0] Starting Server..." | tee -a $LOG_FILE
./scripts/run_sandbox.sh > sandbox_5b.log 2>&1 &
SERVER_PID=$!
sleep 5

cleanup() {
    echo "Stopping server ($SERVER_PID)..."
    kill $SERVER_PID || true
}
trap cleanup EXIT

# 1. Webhook Replay Storm
echo "[1] Webhook Replay Storm Test..." | tee -a $LOG_FILE
node scripts/stress_test.js replay_moonpay >> $LOG_FILE
node scripts/stress_test.js replay_fuse >> $LOG_FILE
sleep 2

# Verify Deduplication
echo "Verifying Deduplication..." | tee -a $LOG_FILE
DUPES_INBOX=$(sqlite3 $DB_PATH "select count(*) from payments_inbox group by provider,event_id having count(*)>1;")
DUPES_REV=$(sqlite3 $DB_PATH "select count(*) from revenue_events group by tx_ref having count(*)>1;")

if [ -z "$DUPES_INBOX" ] && [ -z "$DUPES_REV" ]; then
    echo "PASS: No duplicates found." | tee -a $LOG_FILE
else
    echo "FAIL: Duplicates detected!" | tee -a $LOG_FILE
    echo "Inbox Dupes: $DUPES_INBOX"
    echo "Revenue Dupes: $DUPES_REV"
    exit 1
fi

# 2. Malformed Payloads
echo "[2] Malformed Payload Test..." | tee -a $LOG_FILE
node scripts/stress_test.js malformed >> $LOG_FILE
# Check server still up
HEALTH=$(curl -s "$BASE_URL/integrations/health")
if [[ $HEALTH == *"ok"* ]]; then
    echo "PASS: Server survived malformed payloads." | tee -a $LOG_FILE
else
    echo "FAIL: Server crashed." | tee -a $LOG_FILE
    exit 1
fi

# 3. Concurrency Test
echo "[3] Concurrency Test (20x)..." | tee -a $LOG_FILE
node scripts/stress_test.js concurrency >> $LOG_FILE
sleep 2

# Verify Sum
# We expect 20 * 1.5 = 30 USDT added
# We'll check revenue events from source_type='manual_stress'
TOTAL_STRESS=$(sqlite3 $DB_PATH "SELECT SUM(amount_usdt) FROM revenue_events WHERE source_type='manual_stress';")
echo "Total Stress Revenue: $TOTAL_STRESS" | tee -a $LOG_FILE
# Float comparison?
if (( $(echo "$TOTAL_STRESS >= 30.0" | bc -l) )); then
     echo "PASS: Concurrency revenue looks correct (>= 30)." | tee -a $LOG_FILE
else
     echo "FAIL: Missing revenue? Got $TOTAL_STRESS" | tee -a $LOG_FILE
fi


# 4. Distribution Double-Run
echo "[4] Distribution Double-Run Test..." | tee -a $LOG_FILE
# Get Epoch
EPOCH_ID=$(curl -s "$BASE_URL/epochs/current" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id'))")
echo "Epoch: $EPOCH_ID"

# 4a. Finalize first
curl -s -X POST "$BASE_URL/epochs/finalize" -H "Content-Type: application/json" -H "X-Admin-Key: admin-secret" -d "{\"epochId\": $EPOCH_ID}" >> $LOG_FILE
echo "" >> $LOG_FILE

# 4b. Distribute Once
echo "Run 1:" >> $LOG_FILE
curl -s -X POST "$BASE_URL/rewards/distribute" -H "Content-Type: application/json" -H "X-Admin-Key: admin-secret" -d "{\"epochId\": $EPOCH_ID}" >> $LOG_FILE
echo "" >> $LOG_FILE

# 4c. Distribute Twice
echo "Run 2:" >> $LOG_FILE
RES=$(curl -s -X POST "$BASE_URL/rewards/distribute" -H "Content-Type: application/json" -H "X-Admin-Key: admin-secret" -d "{\"epochId\": $EPOCH_ID}")
echo "$RES" >> $LOG_FILE

if [[ "$RES" == *"Rewards already distributed"* ]]; then
    echo "PASS: Idempotency confirmed." | tee -a $LOG_FILE
else
    echo "FAIL: Did not get idempotency error." | tee -a $LOG_FILE
fi

# 5. Ledger Consistency Check
echo "[5] Ledger Consistency Check..." | tee -a $LOG_FILE
# Sum Revenue for this Epoch
REV_SUM=$(sqlite3 $DB_PATH "SELECT COALESCE(SUM(amount_usdt), 0) FROM revenue_events WHERE epoch_id=$EPOCH_ID;")
DIST_ROW=$(sqlite3 $DB_PATH "SELECT total_revenue, platform_fee, node_pool FROM distribution_runs WHERE epoch_id=$EPOCH_ID;")
# Parse DIST_ROW: 100.0|30.0|50.0
IFS='|' read -r TOTAL_REV PLAT_FEE NODE_POOL <<< "$DIST_ROW"

echo "Revenue Sum vs Dist Run: $REV_SUM vs $TOTAL_REV" | tee -a $LOG_FILE

if (( $(echo "$REV_SUM == $TOTAL_REV" | bc -l) )); then
    echo "PASS: Revenue matches Distribution Record." | tee -a $LOG_FILE
else
    echo "FAIL: Ledger Mismatch!" | tee -a $LOG_FILE
fi

echo "=== RUNG 5B COMPLETED successfully ===" | tee -a $LOG_FILE
