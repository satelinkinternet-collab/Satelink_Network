#!/bin/bash
source .env
PORT=${PORT:-8080}
DB_PATH=${SQLITE_PATH:-satelink.db}

echo "Phase N: Autonomous Ops Smoke Test"

# 1. Mint Admin Token
echo "Minting Admin Token..."
ADMIN_JWT=$(curl -s -X POST http://localhost:$PORT/__test/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

echo "Using Token: ${ADMIN_JWT:0:10}..."

# 2. Check Config
echo "Checking Autonomy Config..."
curl -s -H "Authorization: Bearer $ADMIN_JWT" "http://localhost:$PORT/admin/autonomous/config" | grep "autonomous_ops_enabled" && echo "✅ Config API Reachable" || echo "❌ Config API Failed"

# 3. Enable Autonomy (Simulate)
echo "Enabling Autonomy..."
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
    -d '{"updates": {"autonomous_ops_enabled": true, "auto_reward_enabled": true}}' \
    "http://localhost:$PORT/admin/autonomous/config"
    
# 4. Trigger Analysis
echo "Triggering Analysis..."
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" "http://localhost:$PORT/admin/autonomous/trigger"

# 5. Check Recommendations
echo "Checking Recommendations..."
curl -s -H "Authorization: Bearer $ADMIN_JWT" "http://localhost:$PORT/admin/autonomous/recommendations" | grep "ok" && echo "✅ Recommendations API Reachable"

echo "Phase N Smoke Test Complete"
