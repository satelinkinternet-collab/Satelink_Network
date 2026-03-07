#!/usr/bin/env bash
# agent-env-check.sh — prints NODE_ENV and JWT_SECRET status (never prints the secret)
set -euo pipefail

echo "── Environment Check ───────────────────────────────"

NODE_ENV="${NODE_ENV:-<unset>}"
echo "  NODE_ENV      = $NODE_ENV"

if [ -z "${JWT_SECRET:-}" ]; then
  echo "  JWT_SECRET    = ⚠️  NOT SET"
  JWT_OK=false
else
  LEN=${#JWT_SECRET}
  if [ "$LEN" -ge 64 ]; then
    echo "  JWT_SECRET    = ✅  SET (${LEN} chars — meets 64-char minimum)"
    JWT_OK=true
  else
    echo "  JWT_SECRET    = ⚠️  TOO SHORT (${LEN} chars — minimum is 64)"
    JWT_OK=false
  fi
fi

if [ "$NODE_ENV" = "production" ] && [ "$JWT_OK" = "false" ]; then
  echo ""
  echo "  ❌ FATAL: Production requires JWT_SECRET >= 64 chars."
  exit 1
fi

echo "────────────────────────────────────────────────────"
