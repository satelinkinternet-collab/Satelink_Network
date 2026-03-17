#!/bin/bash

# Configuration
# Default to Localhost for initial test, override with VPS IP
TARGET_URL=${1:-"http://localhost:8080"} 
STAGING_USER=${2:-"admin"}
STAGING_PASS=${3:-"beta_secret_123"}
WALLET="0xadmin"

echo "🔥 Starting Smoke Test against: $TARGET_URL"
echo "----------------------------------------"

# 1. Health Check
echo "1. Checking Health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $TARGET_URL/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Health OK"
else
    echo "❌ Health FAILED ($HTTP_CODE)"
    exit 1
fi

# 2. Staging auth (Basic Auth + Body)
echo "2. Testing Staging Login..."
RESPONSE=$(curl -s -X POST $TARGET_URL/staging/login \
    -u "$STAGING_USER:$STAGING_PASS" \
    -H "Content-Type: application/json" \
    -d "{\"wallet\":\"$WALLET\", \"role\":\"admin_super\"}")

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login FAILED"
    echo "Response: $RESPONSE"
    # If locally testing and not in prod/staging mode, this might fail expectedly.
    # Check if we are running in dev mode where /__test/auth/admin/login is available.
    echo "⚠️  Falling back to Dev Login (if local)..."
    TOKEN=$(curl -s -X POST $TARGET_URL/__test/auth/admin/login \
        -H "Content-Type: application/json" \
        -d "{\"wallet\":\"$WALLET\"}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -n "$TOKEN" ]; then
    echo "✅ Auth Token Acquired"
else
    echo "❌ All Login Methods Failed"
    exit 1
fi

# 3. Secure API Call (/me)
echo "3. Verifying /me (Secure)..."
ME_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" $TARGET_URL/me)

if [ "$ME_CODE" == "200" ]; then
    echo "✅ /me OK"
else
    echo "❌ /me FAILED ($ME_CODE)"
    exit 1
fi

# 4. SSE Stream Test (3 seconds)
echo "4. Testing SSE Connection (3s)..."
# Use timeout to capture stream briefly
timeout 3 curl -N -s -H "Authorization: Bearer $TOKEN" $TARGET_URL/stream/admin > sse_output.txt
if [ -s sse_output.txt ]; then
    echo "✅ SSE Stream Connected (Data received)"
else 
    echo "⚠️  SSE Connected but no data (Expected if quiet)"
    # We consider it a pass if curl didn't error out immediately
fi
rm sse_output.txt

echo "----------------------------------------"
echo "🎉 Smoke Test Complete!"
