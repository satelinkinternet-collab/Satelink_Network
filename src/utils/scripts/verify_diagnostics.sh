#!/bin/bash
set -e

API_URL="http://localhost:8080"
# Generate random wallet
WALLET_JSON=$(node -e "
    const ethers = require('ethers');
    const w = ethers.Wallet.createRandom();
    console.log(JSON.stringify({ address: w.address, privateKey: w.privateKey }));
")
ADDRESS=$(echo "$WALLET_JSON" | jq -r '.address')
PRIVATE_KEY=$(echo "$WALLET_JSON" | jq -r '.privateKey')

echo "1. Starting Auth for $ADDRESS..."
START=$(curl -s -X POST "$API_URL/auth/embedded/start" -H "Content-Type: application/json" -d "{\"address\":\"$ADDRESS\"}")

NONCE=$(echo "$START" | jq -r '.nonce')
TS=$(echo "$START" | jq -r '.created_at')
MSG_TMPL=$(echo "$START" | jq -r '.message_template')

if [ "$TS" == "null" ]; then
  TS=$(date +%s%3N)
fi

echo "2. Signing..."
export MSG_TMPL
export NONCE
export TS
export ADDRESS
export PRIVATE_KEY

SIG=$(node -e "
    const ethers = require('ethers');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const tmpl = process.env.MSG_TMPL;
    
    // Manual replace because template literals in template string are just text unless eval'd
    const msg = tmpl.replace('\${nonce}', process.env.NONCE)
                    .replace('\${address}', process.env.ADDRESS)
                    .replace('\${timestamp}', process.env.TS);
                    
    wallet.signMessage(msg).then(console.log);
")

echo "3. Finishing Auth..."
FINISH=$(curl -s -X POST "$API_URL/auth/embedded/finish" -H "Content-Type: application/json" -d "{\"address\":\"$ADDRESS\", \"signature\":\"$SIG\", \"device_public_id\":\"test_verifier\"}")

TOKEN=$(echo "$FINISH" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ "$TOKEN" == "" ]; then
    echo "❌ Auth Failed: $FINISH"
    exit 1
fi
echo "-> Got JWT"

echo "4. Calling Diagnostics..."
DIAG=$(curl -s -X GET "$API_URL/diagnostics/self-tests" -H "Authorization: Bearer $TOKEN")

# Check results - handle array or object
# diag data is array of results
BINDING=$(echo "$DIAG" | jq -r 'if type=="array" then .[] | select(.kind == "session_binding_sanity") | .status else "error" end')
REAUTH=$(echo "$DIAG" | jq -r 'if type=="array" then .[] | select(.kind == "silent_reauth_contract") | .status else "error" end')

echo "Session Binding Status: $BINDING"
echo "Silent Reauth Status: $REAUTH"

if [ "$BINDING" == "pass" ] && [ "$REAUTH" == "pass" ]; then
    echo "✅ verification_success"
    exit 0
else
    echo "❌ verification_failed"
    echo "$DIAG"
    exit 1
fi
