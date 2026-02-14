#!/bin/bash

# Base URL
API_URL="http://localhost:8080"

# 1. Login as Admin
echo "Logging in..."
ADMIN_TOKEN=$(curl -s -X POST $API_URL/__test/auth/admin/login -H "Content-Type: application/json" -d '{"wallet":"0xadmin"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')
echo "Token: $ADMIN_TOKEN"

# 2. Enable Shadow Mode & Dry Run
echo "Enabling Shadow Mode & Dry Run..."
curl -s -X POST $API_URL/admin/settlement/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shadow_mode": "1", "dry_run": false, "adapter": "SIMULATED"}'
echo ""

# 3. Create a Batch Manually (Inject into DB for test)
DB_PATH="./satelink.db" # Assuming default
echo "Injecting test batch..."
BATCH_ID=$(uuidgen)
sqlite3 $DB_PATH "INSERT INTO payout_batches_v2 (id, status, currency, total_amount, fee_amount, adapter_type, created_at, updated_at) VALUES ('$BATCH_ID', 'queued', 'USDT', 100.0, 1.0, 'SIMULATED', $(date +%s)000, $(date +%s)000);"
ITEM_ID=$(uuidgen)
sqlite3 $DB_PATH "INSERT INTO payout_items_v2 (id, batch_id, wallet, amount, status, created_at, updated_at) VALUES ('$ITEM_ID', '$BATCH_ID', '0xTestWallet', 100.0, 'pending', $(date +%s)000, $(date +%s)000);"

# 4. Process Queue
echo "Processing Queue..."
curl -s -X POST $API_URL/admin/settlement/process-queue \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo ""

# 5. Check Batches
echo "Checking Batches..."
curl -s -X GET "$API_URL/admin/settlement/batches?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo ""

# 6. Check Shadow Log
echo "Checking Shadow Log..."
curl -s -X GET "$API_URL/admin/settlement/shadow-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo ""

# 7. Check Health
echo "Checking Health..."
curl -s -X GET "$API_URL/admin/settlement/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo ""
