#!/bin/bash
set -e

BASE_URL="http://localhost:8080"
LOG_FILE="rung4_cycle.log"

if [ -f .env.sandbox ]; then
    export $(grep -v '^#' .env.sandbox | xargs)
fi

echo "=== RUNG 4: MICRO-PROD CYCLE ===" | tee -a $LOG_FILE

# 0. Start Server
echo "[0] Starting Server..." | tee -a $LOG_FILE
./scripts/run_sandbox.sh > sandbox_r4.log 2>&1 &
SERVER_PID=$!
sleep 5

cleanup() {
    echo "Stopping server ($SERVER_PID)..."
    kill $SERVER_PID || true
}
trap cleanup EXIT

# 1. Health & DB Check
echo "[1] Checking Health & DB..." | tee -a $LOG_FILE
HEALTH=$(curl -s "$BASE_URL/integrations/health")
echo "$HEALTH" | tee -a $LOG_FILE
DB_TYPE=$(echo "$HEALTH" | python3 -c "import sys, json; print(json.load(sys.stdin).get('db_type', 'unknown'))")
echo "App is using DB: $DB_TYPE" | tee -a $LOG_FILE

if [ "$DB_TYPE" != "postgres" ]; then
    echo "WARNING: App is running in '$DB_TYPE' mode. 'Micro-Prod' expects Postgres." | tee -a $LOG_FILE
    # Strict validation: Should we fail?
    # For this verification run, verify functionality first.
fi

# 2. Trigger Payment
echo "[2] Triggering 'Real' Payment Event..." | tee -a $LOG_FILE
# Use node script to send signed webhook
if node scripts/trigger_payment.js; then
    echo "Payment Triggered Successfully." | tee -a $LOG_FILE
else
    echo "Failed to trigger payment. Check secrets." | tee -a $LOG_FILE
    exit 1
fi

sleep 2

# 3. Verify Ingestion
echo "[3] Verifying Ledger Ingestion..." | tee -a $LOG_FILE
STATE=$(curl -s "$BASE_URL/__test/state")
EVENTS=$(echo "$STATE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('events', [])))")

if [ "$EVENTS" -gt 0 ]; then
    echo "PASS: Revenue Event found in DB." | tee -a $LOG_FILE
else
    echo "FAIL: No revenue events found." | tee -a $LOG_FILE
    exit 1
fi

# 4. Finalize Epoch
echo "[4] Finalizing Epoch..." | tee -a $LOG_FILE
EPOCH_ID=$(curl -s "$BASE_URL/epochs/current" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id'))")
echo "Current Epoch: $EPOCH_ID" | tee -a $LOG_FILE

FINALIZE=$(curl -s -X POST "$BASE_URL/epochs/finalize" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Key: admin-secret" \
    -d "{\"epochId\": $EPOCH_ID}")
echo "Finalize: $FINALIZE" | tee -a $LOG_FILE

# 5. Distribute Rewards
echo "[5] Distributing Rewards..." | tee -a $LOG_FILE
DIST=$(curl -s -X POST "$BASE_URL/rewards/distribute" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Key: admin-secret" \
    -d "{\"epochId\": $EPOCH_ID}")
echo "Distribute: $DIST" | tee -a $LOG_FILE

# 6. Verify Balances & Withdraw
echo "[6] Verifying Balances..." | tee -a $LOG_FILE
# Get a wallet from rewards
STATE=$(curl -s "$BASE_URL/__test/state")
WALLET=$(echo "$STATE" | python3 -c "import sys, json; rewards=json.load(sys.stdin).get('rewards', []); print(rewards[0]['node_wallet']) if len(rewards)>0 else ''")

if [ -z "$WALLET" ]; then
    echo "FAIL: No rewards generated, cannot check balance." | tee -a $LOG_FILE
    exit 1
fi

BALANCE=$(curl -s "$BASE_URL/balances/$WALLET")
echo "Balance for $WALLET: $BALANCE" | tee -a $LOG_FILE

AMOUNT=$(echo "$BALANCE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('amount_usdt', 0))")
echo "Available: $AMOUNT"

if (( $(echo "$AMOUNT > 0" | bc -l) )); then
    echo "PASS: Balance funded."
    
    # 7. Withdraw
    echo "[7] Requesting Withdrawal..." | tee -a $LOG_FILE
    WITHDRAW=$(curl -s -X POST "$BASE_URL/withdraw" \
        -H "Content-Type: application/json" \
        -d "{\"wallet\": \"$WALLET\", \"amount\": $AMOUNT}")
    echo "Withdrawal: $WITHDRAW" | tee -a $LOG_FILE
    
    STATUS=$(echo "$WITHDRAW" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'FAIL'))")
    if [ "$STATUS" == "PENDING" ]; then
        echo "PASS: Withdrawal Pending." | tee -a $LOG_FILE
    else
        echo "FAIL: Withdrawal status not PENDING." | tee -a $LOG_FILE
    fi
else
    echo "FAIL: Balance is 0." | tee -a $LOG_FILE
fi

# 8. Idempotency Check
echo "[8] Idempotency Check (Re-run Distribute)..." | tee -a $LOG_FILE
DIST2=$(curl -s -X POST "$BASE_URL/rewards/distribute" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Key: admin-secret" \
    -d "{\"epochId\": $EPOCH_ID}")
echo "Run 2: $DIST2" | tee -a $LOG_FILE

# Check if error or safe return
# Expected: "Rewards already distributed" or similar error
ERR=$(echo "$DIST2" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', ''))")
if [[ "$ERR" == *"already distributed"* ]]; then
    echo "PASS: Idempotency confirmed." | tee -a $LOG_FILE
else
    echo "FAIL: Idempotency check failed (Expected error)." | tee -a $LOG_FILE
fi

echo "=== RUNG 4 COMPLETE ===" | tee -a $LOG_FILE
