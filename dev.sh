#!/bin/bash
set -e

echo "🚀 Satelink Dev Launcher"
echo "========================"

# Kill any existing processes on our ports
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Ensure .env exists
if [ ! -f .env ]; then
  echo "❌ .env file missing. Copy from .env.example first."
  exit 1
fi

# Ensure node_modules exist
if [ ! -d node_modules ]; then
  echo "📦 Installing backend deps..."
  npm install
fi
if [ ! -d web/node_modules ]; then
  echo "📦 Installing frontend deps..."
  cd web && npm install && cd ..
fi

# Start backend in background
echo "🔧 Starting Backend on :8080..."
node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
for i in {1..30}; do
  if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend ready"
    break
  fi
  sleep 1
done

# Seed demo data (dev only)
echo "🌱 Seeding demo data..."
curl -s -X POST http://localhost:8080/__test/seed/admin > /dev/null 2>&1 || true
curl -s -X POST http://localhost:8080/__test/seed/nodes > /dev/null 2>&1 || true

# Mint tokens and display them
echo ""
echo "🔑 Dev Tokens (paste into browser console):"
echo "============================================"

ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin_super","role":"admin_super"}' | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token' 2>/dev/null)

NODE_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xnode_operator_1","role":"node_operator"}' | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token' 2>/dev/null)

BUILDER_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xbuilder_1","role":"builder"}' | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token' 2>/dev/null)

DIST_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xdist_1","role":"distributor_lco"}' | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token' 2>/dev/null)

echo ""
echo "Admin:       localStorage.setItem('satelink_token','$ADMIN_TOKEN')"
echo "Node Op:     localStorage.setItem('satelink_token','$NODE_TOKEN')"
echo "Builder:     localStorage.setItem('satelink_token','$BUILDER_TOKEN')"
echo "Distributor: localStorage.setItem('satelink_token','$DIST_TOKEN')"
echo ""
echo "============================================"

# Start frontend in foreground
echo "🎨 Starting Frontend on :3000..."
cd web && npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "🌐 Satelink Running!"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8080"
echo "  Health:    http://localhost:8080/health"
echo "  Swagger:   http://localhost:8080/api-docs"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill both
trap "echo '🛑 Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for either to exit
wait
