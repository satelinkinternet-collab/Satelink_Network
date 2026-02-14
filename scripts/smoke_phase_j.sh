#!/bin/bash
set -e

API_URL="http://localhost:8080"
echo "Phase J Smoke Test: Non-Crypto UX Mode"

# 1. New User Login (generates wallet)
WALLET_JSON=$(node -e "
    const ethers = require('ethers');
    const w = ethers.Wallet.createRandom();
    console.log(JSON.stringify({ address: w.address, privateKey: w.privateKey }));
")
ADDRESS=$(echo "$WALLET_JSON" | jq -r '.address')
PRIVATE_KEY=$(echo "$WALLET_JSON" | jq -r '.privateKey')

echo "Login as $ADDRESS..."
START=$(curl -s -X POST "$API_URL/auth/embedded/start" -H "Content-Type: application/json" -d "{\"address\":\"$ADDRESS\"}")
NONCE=$(echo "$START" | jq -r '.nonce')
TS=$(echo "$START" | jq -r '.created_at')
if [ "$TS" == "null" ]; then TS=$(date +%s%3N); fi

export MSG_TMPL="$(echo "$START" | jq -r '.message_template')"
export NONCE
export TS
export ADDRESS
export PRIVATE_KEY

SIG=$(node -e "
    const ethers = require('ethers');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const tmpl = process.env.MSG_TMPL;
    const msg = tmpl.replace('\${nonce}', process.env.NONCE)
                    .replace('\${address}', process.env.ADDRESS)
                    .replace('\${timestamp}', process.env.TS);
    wallet.signMessage(msg).then(console.log);
")

FINISH=$(curl -s -X POST "$API_URL/auth/embedded/finish" -H "Content-Type: application/json" -d "{\"address\":\"$ADDRESS\", \"signature\":\"$SIG\", \"device_public_id\":\"smoke_test_j\"}")
TOKEN=$(echo "$FINISH" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ "$TOKEN" == "" ]; then
    echo "❌ Auth Failed"
    exit 1
fi

echo "✅ Auth Success"

# 2. Check Default Settings (Should be SIMPLE)
echo "Checking Settings..."
SETTINGS=$(curl -s -X GET "$API_URL/me/settings" -H "Authorization: Bearer $TOKEN")
MODE=$(echo "$SETTINGS" | jq -r '.settings.ui_mode')
PUBLIC_ID=$(echo "$SETTINGS" | jq -r '.settings.public_id')

if [ "$MODE" != "SIMPLE" ]; then
    echo "❌ Default mode is $MODE, expected SIMPLE"
    exit 1
fi
if [[ "$PUBLIC_ID" != SLK-* ]]; then
    echo "❌ Invalid Public ID: $PUBLIC_ID"
    exit 1
fi
echo "✅ Default Mode: SIMPLE, Public ID: $PUBLIC_ID"

# 3. Toggle Mode to ADVANCED
echo "Toggling to ADVANCED..."
TOGGLE=$(curl -s -X POST "$API_URL/me/settings" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"ui_mode": "ADVANCED"}')
# Check persistence
SETTINGS_2=$(curl -s -X GET "$API_URL/me/settings" -H "Authorization: Bearer $TOKEN")
MODE_2=$(echo "$SETTINGS_2" | jq -r '.settings.ui_mode')

if [ "$MODE_2" != "ADVANCED" ]; then
    echo "❌ Failed to toggle mode. Got $MODE_2"
    exit 1
fi
echo "✅ Mode Toggled to ADVANCED"

# 4. Check Dual Currency Balance
echo "Checking Balance Summary..."
BALANCE=$(curl -s -X GET "$API_URL/me/balance/summary" -H "Authorization: Bearer $TOKEN")
INR=$(echo "$BALANCE" | jq -r '.balance.inr')
CURRENCY=$(echo "$BALANCE" | jq -r '.balance.currency_code')

if [ "$CURRENCY" != "INR" ]; then
    echo "❌ Balance summary missing INR"
    echo "Response: $BALANCE"
    exit 1
fi
echo "✅ Balance Summary OK (INR: $INR)"

# 5. Check Onboarding Step
echo "Completing Onboarding Step..."
ONBOARD=$(curl -s -X POST "$API_URL/me/onboarding/step" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"step_id": "welcome"}')
STEPS=$(echo "$ONBOARD" | jq -r '.steps.welcome')

if [ "$STEPS" != "true" ]; then
    echo "❌ Onboarding step failed"
    echo "Response: $ONBOARD"
    exit 1
fi
echo "✅ Onboarding Step Recorded"

echo "✅ Phase J Smoke Test Passed"
exit 0
