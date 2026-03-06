#!/bin/bash
echo "Stopping Satelink E2E system..."

if [ -f logs/backend.pid ]; then
  BACKEND_PID=$(cat logs/backend.pid)
  echo "Killing backend (PID $BACKEND_PID)..."
  kill $BACKEND_PID 2>/dev/null || true
  rm -f logs/backend.pid
fi

if [ -f logs/frontend.pid ]; then
  FRONTEND_PID=$(cat logs/frontend.pid)
  echo "Killing frontend (PID $FRONTEND_PID)..."
  kill $FRONTEND_PID 2>/dev/null || true
  rm -f logs/frontend.pid
fi

echo "Cleaning up orphan ports..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "System stopped cleanly."
