#!/bin/bash
# Monitor Satelink Health
# Usage: ./monitor.sh

echo "🏥 Checking System Health..."

HEALTH=$(curl -s http://localhost:8080/health)

if [[ $HEALTH == *"ok"* ]]; then
  echo "✅ System is ONLINE"
  echo "Response: $HEALTH"
  exit 0
else
  echo "❌ System is OFFLINE or UNHEALTHY"
  echo "Response: $HEALTH"
  exit 1
fi
