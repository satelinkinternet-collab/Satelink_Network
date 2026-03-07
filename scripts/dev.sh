#!/bin/bash

# Configuration
PORT=${PORT:-8080}
LOG_FILE="logs/dev.log"

echo "=== Satelink Dev Start ==="

# 1. Kill existing listeners on PORT
echo "Cleaning up port $PORT..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true

# 2. Start server
echo "Starting server on port $PORT..."
echo "Logging to $LOG_FILE"
mkdir -p logs
PORT=$PORT node server.js > "$LOG_FILE" 2>&1 &

# Store PID
SERVER_PID=$!
echo $SERVER_PID > server.pid

# 3. Wait for boot
sleep 2

# 4. Print useful info
echo "OPEN: http://localhost:$PORT/health"
echo "OPEN: http://localhost:$PORT/"
echo "OPEN: http://localhost:$PORT/ui"
echo "ROUTES: node scripts/list_routes.mjs"
echo "=== Startup Complete (PID: $SERVER_PID) ==="
