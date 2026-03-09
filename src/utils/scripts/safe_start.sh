#!/bin/bash

echo "[SAFE_START] Killing old node processes..."
pkill -f "node server.js" || true
pkill -f "node server" || true
sleep 2

echo "[SAFE_START] Starting server..."
npm start > server.log 2>&1 &
SERVER_PID=$!
echo "[SAFE_START] Server PID: $SERVER_PID"

echo "[SAFE_START] Waiting for health check..."
for i in {1..30}; do
  if curl -s http://localhost:8080/health > /dev/null; then
    echo "[SAFE_START] Server is UP!"
    curl -s http://localhost:8080/health | node -pe 'JSON.stringify(JSON.parse(fs.readFileSync(0)), null, 2)'
    exit 0
  fi
  sleep 1
done

echo "[SAFE_START] Timeout waiting for server!"
exit 1
