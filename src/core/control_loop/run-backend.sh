#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source control_loop/config_env.sh; set +a

mkdir -p logs
lsof -ti ":${PORT}" | xargs -r kill -9 || true

echo "[CONTROL] starting backend on PORT=${PORT} NODE_ENV=${NODE_ENV}"
node server.js 2>&1 | tee "logs/backend-$(date +%Y%m%d-%H%M%S).log"
