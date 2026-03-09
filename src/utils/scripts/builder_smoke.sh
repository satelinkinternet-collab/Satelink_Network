#!/bin/bash
# scripts/builder_smoke.sh
# Rung 10b Verification

HOST="http://localhost:8080"
WALLET="0x1234567890123456789012345678901234567890"

echo "[TEST] 1. Dev Login"
curl -s -c cookies.txt -b cookies.txt -X POST "$HOST/__test/auth/builder/login" \
  -H "Content-Type: application/json" -d "{\"wallet\":\"$WALLET\"}" | grep "success" || exit 1
echo " -> OK"

echo "[TEST] 2. Create Project"
curl -s -c cookies.txt -b cookies.txt -X POST "$HOST/builder/projects" \
  -H "Content-Type: application/json" -d '{"name":"Smoke Test Project"}' | grep "success" || exit 1
echo " -> OK"

echo "[TEST] 3. Get Project ID"
# We list projects and grab the first one
PROJ_ID=$(curl -s -c cookies.txt -b cookies.txt "$HOST/builder/projects" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo " -> Project ID: $PROJ_ID"

echo "[TEST] 4. Create API Key"
KEY_RESP=$(curl -s -c cookies.txt -b cookies.txt -X POST "$HOST/builder/projects/$PROJ_ID/keys")
API_KEY=$(echo $KEY_RESP | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
echo " -> API Key: $API_KEY"

echo "[TEST] 5. Usage Ingest"
curl -s -X POST "$HOST/v1/builder/usage" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"endpoint\":\"smoke_test\",\"qty\":10,\"unit_price_usdt\":0.05,\"payer_wallet\":\"$WALLET\",\"meta\":{\"test\":true}}" \
  | grep "success" || exit 1
echo " -> OK"

echo "[TEST] 6. Verify UI Route"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -c cookies.txt -b cookies.txt "$HOST/ui/builder/projects/$PROJ_ID")
if [ "$CODE" -eq 200 ]; then
  echo " -> UI Route OK (200)"
else
  echo " -> UI Route FAILED ($CODE)"
  exit 1
fi

echo "[SUCCESS] All Rung 10b Smoke Tests Passed"
rm cookies.txt
