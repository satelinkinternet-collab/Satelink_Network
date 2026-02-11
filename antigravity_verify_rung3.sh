#!/bin/bash
BASE_URL="http://localhost:8080"
DB_PATH="satelink.db"

echo "=== RUNG 3: REAL SANDBOX VERIFICATION ==="
echo "Testing against $BASE_URL"

# 1. Health Check
echo ""
echo "[1] System Health"
curl -s "$BASE_URL/integrations/health" | python3 -m json.tool || echo "Health check failed"

# 2. Delivery Log
echo ""
echo "[2] Recent Webhook Deliveries (Last 5)"
curl -s "$BASE_URL/__test/deliveries?limit=5" | python3 -m json.tool

# 3. NodeOps Ping
echo ""
echo "[3] NodeOps API Ping"
curl -s -i "$BASE_URL/integrations/nodeops/ping"
echo ""

# 4. DB Proof: MoonPay
echo ""
echo "[4] Database Proof: MoonPay (Last 3 Events)"
sqlite3 $DB_PATH "SELECT id, provider, source_type, payer_wallet, amount_usdt, tx_ref FROM revenue_events WHERE provider='moonpay' ORDER BY id DESC LIMIT 3;"

# 5. DB Proof: Fuse
echo ""
echo "[5] Database Proof: Fuse (Last 3 Events)"
sqlite3 $DB_PATH "SELECT id, provider, source_type, payer_wallet, amount_usdt, tx_ref FROM revenue_events WHERE provider='fuse' ORDER BY id DESC LIMIT 3;"

# 6. Deduplication Check
echo ""
echo "[6] Deduplication Verification (Should be empty)"
MOONPAY_DUPE=$(sqlite3 $DB_PATH "SELECT provider, event_id, count(*) FROM payments_inbox WHERE provider='moonpay' GROUP BY provider, event_id HAVING count(*) > 1;")
FUSE_DUPE=$(sqlite3 $DB_PATH "SELECT provider, event_id, count(*) FROM payments_inbox WHERE provider='fuse' GROUP BY provider, event_id HAVING count(*) > 1;")

if [ -n "$MOONPAY_DUPE" ]; then
    echo "FAIL: Duplicate MoonPay events found!"
    echo "$MOONPAY_DUPE"
else
    echo "PASS: No MoonPay duplicates."
fi

if [ -n "$FUSE_DUPE" ]; then
    echo "FAIL: Duplicate Fuse events found!"
    echo "$FUSE_DUPE"
else
    echo "PASS: No Fuse duplicates."
fi

echo ""
echo "=== END VERIFICATION ==="
