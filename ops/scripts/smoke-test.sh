#!/bin/bash

BASE_URL="http://localhost:8080"

echo "Running Satelink Smoke Tests..."

fail_test() {
  echo "FAILED: $1"
  exit 1
}

echo -n "1. Backend health (GET /health) -> "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [[ "$STATUS" != "200" ]]; then fail_test "Health check failed (HTTP $STATUS)"; fi
echo "OK"

echo -n "2. Authentication (POST /auth/register) -> "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"username":"smoketest_user_'$(date +%s)'", "password":"password123", "email":"smoke@test.com"}' "$BASE_URL/auth/register")
if [[ "$STATUS" != "201" && "$STATUS" != "200" && "$STATUS" != "400" ]]; then 
  fail_test "Registration failed (HTTP $STATUS)"
fi
echo "OK (HTTP $STATUS)"

echo -n "3. Network stats (GET /api/network/stats) -> "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/network/stats")
if [[ "$STATUS" == "5"* || "$STATUS" == "000" || "$STATUS" == "404" ]]; then fail_test "Network stats failed (HTTP $STATUS)"; fi
echo "OK (HTTP $STATUS)"

echo -n "4. Node earnings (GET /api/node/earnings) -> "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/node/earnings")
if [[ "$STATUS" == "5"* || "$STATUS" == "000" || "$STATUS" == "404" ]]; then fail_test "Node earnings failed (HTTP $STATUS)"; fi
echo "OK (HTTP $STATUS)"

echo -n "5. Economics split (GET /api/economics/split) -> "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/economics/split")
if [[ "$STATUS" == "5"* || "$STATUS" == "000" || "$STATUS" == "404" ]]; then fail_test "Economics split failed (HTTP $STATUS)"; fi
echo "OK (HTTP $STATUS)"

echo "All smoke tests passed!"
