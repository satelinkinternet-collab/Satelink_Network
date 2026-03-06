#!/bin/bash
set -e

echo "Running Satelink Deployment Readiness Check..."

# Check Node version
NODE_V=$(node -v)
echo "Node version: $NODE_V"
if [[ "$NODE_V" != "v18"* && "$NODE_V" != "v20"* && "$NODE_V" != "v22"* ]]; then
  echo "⚠️ Warning: Node LTS (18, 20, or 22) recommended."
fi

# Check npm dependencies
echo -n "Checking npm... "
if command -v npm > /dev/null; then echo "OK"; else echo "FAILED"; exit 1; fi

# Database connectivity (SQLite for local, just check if curl works for Postgres or assume test connection)
# We can check if postgres client or sqlite3 exists based on env, or just verify if db is connected via health check.
echo -n "Checking Postgres/SQLite CLI... "
if command -v psql > /dev/null || command -v sqlite3 > /dev/null; then echo "OK"; else echo "FAILED"; exit 1; fi

# Check Ports
echo -n "Checking port availability... "
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
  echo "⚠️ Port 8080 is already in use."
  PORT_CLEAR=false
else
  PORT_CLEAR=true
fi
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
  echo "⚠️ Port 3000 is already in use."
  PORT_CLEAR=false
fi
if [ "$PORT_CLEAR" != "false" ]; then echo "OK"; fi

# Check Docker availability
echo -n "Checking Docker... "
if command -v docker > /dev/null; then echo "OK"; else echo "FAILED"; exit 1; fi
if command -v docker-compose > /dev/null || docker compose version > /dev/null; then echo "Compose OK"; else echo "Compose FAILED"; exit 1; fi

echo "Deployment readiness check passed!"
