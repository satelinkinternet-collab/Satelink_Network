#!/bin/bash
set -e

echo "Starting Satelink E2E boot sequence..."

mkdir -p logs

echo "Installing backend dependencies..."
npm install

echo "Installing frontend dependencies..."
cd web && npm install && cd ..

echo "Starting backend..."
node server.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > logs/backend.pid
echo "Backend started with PID $BACKEND_PID"

echo "Starting frontend..."
npm run dev --prefix web > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > logs/frontend.pid
echo "Frontend started with PID $FRONTEND_PID"

echo "Waiting for services to become available..."

# Wait for backend
echo "Waiting for backend on port 8080..."
until curl -s http://localhost:8080/health > /dev/null; do
  sleep 2
done
echo "Backend is up!"

# Wait for frontend (just a simple curl to 3000)
echo "Waiting for frontend on port 3000..."
until curl -s http://localhost:3000 > /dev/null; do
  sleep 2
done
echo "Frontend is up!"

echo "System boot complete."
echo "Backend URL: http://localhost:8080"
echo "Frontend URL: http://localhost:3000"
