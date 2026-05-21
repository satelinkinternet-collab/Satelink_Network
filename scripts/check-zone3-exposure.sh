#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Zone 3 Exposure Check
# Blocks if any Zone 3 internal files would be published
# Run this before any public repo sync
# ═══════════════════════════════════════════════════════════════════

echo "🔒 Zone 3 Exposure Check"
echo "════════════════════════════════════════════════════════════"

ZONE3_PATHS=(
  # Core operational engines
  "apps/api/src/core/operations_engine.js"
  "apps/api/src/monitoring/sla_engine.js"
  "apps/api/src/workloads/auto_ops_engine.js"

  # Sentinel (when built)
  "apps/api/src/sentinel"
  "src/sentinel"

  # Multi-agent orchestration
  "apps/api/src/ops-agent"
  "src/agents"

  # Scheduler internals
  "apps/api/src/scheduler/jobs"
  "src/jobs/scheduler.js"

  # Vendor integrations
  "apps/api/src/integrations/nodeops.js"

  # Admin routes (20 files)
  "apps/api/src/gateway/routes/admin_api_v2.js"
  "apps/api/src/gateway/routes/admin_autonomous.js"
  "apps/api/src/gateway/routes/admin_control_api.js"
  "apps/api/src/gateway/routes/admin_control_room_api.js"
  "apps/api/src/gateway/routes/admin_distributors.js"
  "apps/api/src/gateway/routes/admin_economics.js"
  "apps/api/src/gateway/routes/admin_flywheel.js"
  "apps/api/src/gateway/routes/admin_forensics.js"
  "apps/api/src/gateway/routes/admin_genesis.js"
  "apps/api/src/gateway/routes/admin_growth.js"
  "apps/api/src/gateway/routes/admin_launch.js"
  "apps/api/src/gateway/routes/admin_lifecycle.js"
  "apps/api/src/gateway/routes/admin_network.js"
  "apps/api/src/gateway/routes/admin_partners.js"
  "apps/api/src/gateway/routes/admin_reputation.js"
  "apps/api/src/gateway/routes/admin_revenue.js"
  "apps/api/src/gateway/routes/admin_sla.js"
  "apps/api/src/gateway/routes/admin_system.js"
  "apps/api/src/gateway/routes/admin_workloads.js"
  "apps/api/src/routes/admin_mal_route.mjs"

  # Admin UI pages
  "apps/api/src/gateway/pages/admin"
  "apps/web/src/app/admin"
  "apps/dashboard/src/app/admin"

  # Security gate scripts
  "scripts/security"
)

FAIL=0
FOUND_FILES=()

for path in "${ZONE3_PATHS[@]}"; do
  if [ -e "$path" ]; then
    echo "  ⛔ ZONE3: $path"
    FOUND_FILES+=("$path")
    FAIL=1
  fi
done

echo ""
if [ $FAIL -eq 1 ]; then
  echo "════════════════════════════════════════════════════════════"
  echo "❌ FAILED: ${#FOUND_FILES[@]} Zone 3 files detected."
  echo ""
  echo "These files must NOT appear in the public Zone 2 repo."
  echo "Run this check on the public repo export, not the internal repo."
  echo ""
  echo "To fix: Remove Zone 3 files before publishing, or use"
  echo "a filtered git archive that excludes these paths."
  echo "════════════════════════════════════════════════════════════"
  exit 1
fi

echo "✅ Zone 3 exposure check passed."
echo "   No internal files detected in current directory."
exit 0
