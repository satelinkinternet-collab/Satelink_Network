#!/bin/bash

# Ensure local dev env is running first (e.g. npm run dev)
PORT=${PORT:-3000}
BASE_URL="http://localhost:$PORT"

TEST_EMAIL="testuser_$(date +%s)@example.com"
TEST_PASS="securepassword123!"

echo "=================================="
echo "Satelink Permissionless Onboarding - Smoke Test"
echo "=================================="

# 1. Register User
echo "\n[1] Registering User: $TEST_EMAIL"
REG_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")

echo "Response: $REG_RES"

TOKEN=$(echo $REG_RES | grep -o '\"token\":\"[^\"]*' | grep -o '[^\"]*$')

if [ -z "$TOKEN" ]; then
    echo "❌ Registration failed or no token returned."
    exit 1
fi
echo "✅ Registration successful. Received JWT token."

# 2. Duplicate Registration Test
echo "\n[2] Testing Duplicate Registration (Expect Error)"
DUP_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")
echo "Response: $DUP_RES"

# 3. Login User
echo "\n[3] Testing Login"
LOG_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")

echo "Response: $LOG_RES"

# 4. JWT Verification on /me endpoint
echo "\n[4] Testing JWT Verification (GET /me)"
ME_RES=$(curl -s -X GET "$BASE_URL/me" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $ME_RES"

# 5. Rate Limit Test
echo "\n[5] Testing Rate Limits (Auth Endpoints)"
echo "Sending 15 rapid login requests to trigger 429..."
for i in {1..15}; do
    curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE_URL/auth/login" \
         -H "Content-Type: application/json" \
         -d "{\"email\": \"wrong@example.com\", \"password\": \"wrongpass\"}" &
done
wait
echo "Note: If you see 429s above, the rate limiter is working."

echo "\n-----------------------------------"
echo "Smoke test complete."
