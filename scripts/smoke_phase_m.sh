#!/bin/bash
echo "Phase M Smoke Test: Real Real Analytics"
source .env
DB_PATH=${SQLITE_PATH:-satelink.db}

# 1. Seed Data
echo "Seeding Econ Data to $DB_PATH..."
# Create a node, some ops, some revenue
sqlite3 "$DB_PATH" <<EOF
INSERT OR IGNORE INTO nodes (node_id, region, status, last_seen) VALUES ('node-m1', 'asia-1', 'active', strftime('%s','now'));
INSERT OR IGNORE INTO revenue_events_v2 (client_id, amount_usdt, created_at) VALUES ('client-test', 10.0, strftime('%s','now')*1000);
INSERT OR IGNORE INTO request_traces (trace_id, client_id, ip_hash, created_at) VALUES ('trace-m1', 'client-test', 'ip-hash-1', strftime('%s','now')*1000);
INSERT OR IGNORE INTO users (primary_wallet, created_at) VALUES ('0xuser1', strftime('%s','now')*1000 - 86400000);
EOF

# 2. Mint Admin Token
echo "Minting Admin Token..."
ADMIN_JWT=$(curl -s -X POST http://localhost:8080/__test/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

echo "Using Token: ${ADMIN_JWT:0:10}..."

# 3. Trigger Scheduler manually (via mocked script or wait)
# Or easier: Create a script that instantiates services and runs them.
# We will use 'scripts/verify_phase_m.mjs' for deep verification.
# This bash script just pings endpoints.

# Start Server
# node server.js > /tmp/server_m.log 2>&1 &
# PID=$!
# sleep 5

PORT=${PORT:-8080}

# 3. Check Endpoints
check_endpoint() {
    NAME=$1
    URL=$2
    echo "Checking $NAME API..."
    RESP=$(curl -s -H "Authorization: Bearer $ADMIN_JWT" "$URL")
    if echo "$RESP" | grep -q "ok"; then
        echo "✅ $NAME API OK"
    else
        echo "❌ $NAME API Failed"
        echo "Response: ${RESP:0:200}"
    fi
}

check_endpoint "Breakeven" "http://localhost:$PORT/admin/economics/breakeven"
check_endpoint "Authenticity" "http://localhost:$PORT/admin/economics/authenticity"
check_endpoint "Retention" "http://localhost:$PORT/admin/growth/retention"
check_endpoint "Stability" "http://localhost:$PORT/admin/economics/stability"
check_endpoint "Density" "http://localhost:$PORT/admin/network/density?mode=latest"

# kill $PID
echo "Phase M Smoke Test Completed."
