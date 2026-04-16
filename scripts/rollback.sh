#!/usr/bin/env bash
# Auto-rollback to previous Docker tag on smoke test failure
set -euo pipefail
REGISTRY="${REGISTRY:-ghcr.io/satelinkinternet-collab/satelink}"
PREVIOUS_TAG="${1:-previous}"

echo "🔄 ROLLBACK: reverting to $REGISTRY:$PREVIOUS_TAG"

docker pull "$REGISTRY:$PREVIOUS_TAG"
docker stop satelink-backend 2>/dev/null || true
docker rm satelink-backend 2>/dev/null || true
docker run -d \
  --name satelink-backend \
  --restart unless-stopped \
  --env-file .env \
  -p 8080:8080 \
  "$REGISTRY:$PREVIOUS_TAG"

echo "✅ Rollback complete — running smoke test on reverted version"
sleep 5
bash scripts/smoke_test.sh

# Notify
curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"⚠️ **Satelink AUTO-ROLLBACK** executed — reverted to tag \`$PREVIOUS_TAG\` due to smoke test failure.\"}" 2>/dev/null || true

curl -s -X POST "${SLACK_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"⚠️ *Satelink AUTO-ROLLBACK* — reverted to \`$PREVIOUS_TAG\`\"}" 2>/dev/null || true
