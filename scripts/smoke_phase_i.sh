#!/bin/bash
set -e

# Configuration
API_URL="http://localhost:8080"
ADMIN_WALLET="0xAdminUser"
DEVICE_ID="test_device_smoke"

echo "=== Smoke Test Phase I: Embedded Security Hardening ==="

# 1. Start Reauth Flow (Get Nonce)
echo "1. Testing /auth/reauth/start..."
RESPONSE=$(curl -s -X POST "$API_URL/auth/reauth/start" \
  -H "Content-Type: application/json" \
  -d "{\"wallet\":\"$ADMIN_WALLET\", \"scope\":\"revoke_device\"}")

if [[ $(echo "$RESPONSE" | jq -r '.ok') != "true" ]]; then
    echo "❌ Start Reauth Failed: $RESPONSE"
    exit 1
fi

NONCE=$(echo "$RESPONSE" | jq -r '.nonce')
MESSAGE_TEMPLATE=$(echo "$RESPONSE" | jq -r '.message')
echo "   -> Got Nonce: $NONCE"

# 2. Simulate Signing (Using node script)
echo "2. Simulating Signature..."
SIGNATURE=$(node -e "
    const ethers = require('ethers');
    const wallet = new ethers.Wallet(ethers.id('secret_key_for_testing')); // Deterministic key for 0xAdminUser?
    // Wait, I need a real wallet to match address.
    // Let's generate one on fly and use its address for step 1?
    const w = ethers.Wallet.createRandom();
    console.log(JSON.stringify({ address: w.address, privateKey: w.privateKey }));
")

TEMP_WALLET_ADDR=$(echo "$SIGNATURE" | jq -r '.address')
TEMP_PRIVATE_KEY=$(echo "$SIGNATURE" | jq -r '.privateKey')

# Restart flow with real wallet
echo "   -> Restarting with real temp wallet: $TEMP_WALLET_ADDR"
RESPONSE=$(curl -s -X POST "$API_URL/auth/reauth/start" \
  -H "Content-Type: application/json" \
  -d "{\"wallet\":\"$TEMP_WALLET_ADDR\", \"scope\":\"revoke_device\"}")
NONCE=$(echo "$RESPONSE" | jq -r '.nonce')

# Construct Message (Must match backend template exactly)
# Backtick issue in shell script?
# Template: "Sign this message to confirm action: ${scope}\nNonce: ${nonce}\nDomain: ${host}"
# Host is localhost:8080 in curl? No, req.get('host')
HOST="localhost:8080"
SCOPE="revoke_device"
MESSAGE="Sign this message to confirm action: $SCOPE\nNonce: $NONCE\nDomain: $HOST"

echo "   -> Message to sign: $MESSAGE"

ACTUAL_SIG=$(node -e "
    const ethers = require('ethers');
    const wallet = new ethers.Wallet('$TEMP_PRIVATE_KEY');
    wallet.signMessage(\`$MESSAGE\`).then(console.log);
")

echo "   -> Signature: ${ACTUAL_SIG:0:20}..."

# 3. Finish Reauth (Get Token)
echo "3. Testing /auth/reauth/finish..."
FINISH_RESP=$(curl -s -X POST "$API_URL/auth/reauth/finish" \
  -H "Content-Type: application/json" \
  -d "{\"wallet\":\"$TEMP_WALLET_ADDR\", \"scope\":\"$SCOPE\", \"signature\":\"$ACTUAL_SIG\", \"nonce\":\"$NONCE\"}")

if [[ $(echo "$FINISH_RESP" | jq -r '.ok') != "true" ]]; then
    # It might fail if Domain doesn't match?
    # req.get('host') header in curl.
    # By default curl sends Host: localhost:8080
    echo "❌ Finish Reauth Failed: $FINISH_RESP"
    # Debug info
    echo "   (Check logic domain match)"
    exit 1
fi

REAUTH_TOKEN=$(echo "$FINISH_RESP" | jq -r '.reauth_token')
echo "   -> Got ReAuth Token: ${REAUTH_TOKEN:0:10}..."

# 4. Test Protected Endpoint (Revoke Device)
# First we need to login to have a 'user' session for req.user check?
# Wait, /auth/account/devices/revoke requires `req.user.wallet`.
# And `req.user` comes from `authenticateToken` middleware which checks `Authorization` header or Cookie.
# I need to login first to get a JWT.
echo "4. Logging in to get JWT..."

# Start Auth
AUTH_START=$(curl -s -X POST "$API_URL/auth/embedded/start" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$TEMP_WALLET_ADDR\"}")
AUTH_NONCE=$(echo "$AUTH_START" | jq -r '.nonce')
AUTH_TS=$(echo "$AUTH_START" | jq -r '.created_at')

# Sign Auth Message
# Template: Welcome to Satelink!\n\nAuthorize your device by signing this nonce: ${nonce}\n\nAddress: ${address}\nTimestamp: ${timestamp}
AUTH_MSG="Welcome to Satelink!\n\nAuthorize your device by signing this nonce: $AUTH_NONCE\n\nAddress: $TEMP_WALLET_ADDR\nTimestamp: $AUTH_TS"
AUTH_SIG=$(node -e "
    const ethers = require('ethers');
    const wallet = new ethers.Wallet('$TEMP_PRIVATE_KEY');
    wallet.signMessage(\`$AUTH_MSG\`).then(console.log);
")

# Finish Auth
AUTH_FINISH=$(curl -s -X POST "$API_URL/auth/embedded/finish" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$TEMP_WALLET_ADDR\", \"signature\":\"$AUTH_SIG\", \"device_public_id\":\"$DEVICE_ID\"}")

JWT=$(echo "$AUTH_FINISH" | jq -r '.token')
echo "   -> Got JWT: ${JWT:0:10}..."

# 5. Revoke Device (Verify Protection)
echo "5. Testing /auth/account/devices/revoke..."

# 5a. Without Token (Expect 403)
FAIL_RESP=$(curl -s -X POST "$API_URL/auth/account/devices/revoke" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"device_public_id\":\"$DEVICE_ID\"}")

CODE=$(echo "$FAIL_RESP" | jq -r '.code')
if [[ "$CODE" != "REAUTH_REQUIRED" ]]; then
    echo "❌ Expected REAUTH_REQUIRED, got: $FAIL_RESP"
    exit 1
fi
echo "   -> Correctly blocked without token (403)"

# 5b. With Token (Expect 200)
SUCCESS_RESP=$(curl -s -X POST "$API_URL/auth/account/devices/revoke" \
  -H "Authorization: Bearer $JWT" \
  -H "x-reauth-token: $REAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"device_public_id\":\"$DEVICE_ID\"}")

if [[ $(echo "$SUCCESS_RESP" | jq -r '.ok') != "true" ]]; then
    echo "❌ Revoke Failed with Token: $SUCCESS_RESP"
    exit 1
fi
echo "   -> Successfully revoked device with token"

# 5c. Verify DB Update (Optional via curl list)
LIST_RESP=$(curl -s -X GET "$API_URL/auth/account/devices" -H "Authorization: Bearer $JWT")
# Should be empty or status revoked?
# List endpoint filters `status = 'active'`.
# So device should be gone.
COUNT=$(echo "$LIST_RESP" | jq '.devices | length')
if [[ "$COUNT" != "0" ]]; then
     echo "❌ Device still appeared in active list: $LIST_RESP"
     exit 1
fi
echo "   -> Device removed from active list"

echo "✅ All Smoke Tests Passed for Phase I"
