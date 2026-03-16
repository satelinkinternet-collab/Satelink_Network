#!/usr/bin/env bash
# ============================================================================
# Satelink 72-Hour Autonomous Endurance Test Orchestrator
# ============================================================================
#
# Usage:
#   ./scripts/run_72h_test.sh [--duration HOURS] [--local]
#
# Flags:
#   --duration N  Hours to run (default: 72)
#   --local       Run against local dev server (skip Docker)
#
# Requires:
#   docker compose, node >= 18, curl
# ============================================================================

set -euo pipefail

DURATION_HOURS=${DURATION_HOURS:-72}
API_BASE=${API_BASE:-"http://localhost:8080"}
LOGS_DIR="$(pwd)/logs"
PIDS_FILE="$LOGS_DIR/.test_pids"
USE_DOCKER=true

# Parse flags
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration) DURATION_HOURS="$2"; shift 2;;
        --local) USE_DOCKER=false; shift;;
        *) echo "Unknown flag: $1"; exit 1;;
    esac
done

DURATION_SECONDS=$((DURATION_HOURS * 3600))

# ── Helpers ──
timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $*"; }
die() { log "FATAL: $*"; cleanup; exit 1; }

cleanup() {
    log "Cleaning up..."
    if [ -f "$PIDS_FILE" ]; then
        while read -r pid; do
            kill "$pid" 2>/dev/null || true
        done < "$PIDS_FILE"
        rm -f "$PIDS_FILE"
    fi
}
trap cleanup EXIT

mkdir -p "$LOGS_DIR"
> "$PIDS_FILE"

log "============================================"
log "  Satelink 72-Hour Endurance Test"
log "  Duration: ${DURATION_HOURS}h (${DURATION_SECONDS}s)"
log "  API:      $API_BASE"
log "  Logs:     $LOGS_DIR"
log "============================================"

# ── Phase 1: Start Infrastructure ──
if $USE_DOCKER; then
    log "Starting Docker stack..."
    docker compose up -d --build 2>&1 | tee "$LOGS_DIR/docker_startup.log"
    log "Waiting for containers to stabilize (30s)..."
    sleep 30
fi

# ── Phase 2: Wait for API Health ──
log "Waiting for API health check..."
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
    STATUS=$(curl -sf "$API_BASE/health" 2>/dev/null | grep -o '"status":"ok"' || true)
    if [ -n "$STATUS" ]; then
        log "API healthy after $i attempts."
        break
    fi
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        die "API failed to become healthy after $MAX_RETRIES attempts"
    fi
    sleep 5
done

# ── Phase 3: Seed Test Data (if dev) ──
if [ "${SEED_DATA:-false}" = "true" ]; then
    log "Seeding test data..."
    curl -sf -X POST "$API_BASE/__test/seed/admin" > /dev/null 2>&1 || true
    curl -sf -X POST "$API_BASE/__test/seed/nodes" > /dev/null 2>&1 || true
    log "Seeding complete."
fi

# ── Phase 4: Get Admin Token ──
if [ -z "${ADMIN_TOKEN:-}" ]; then
    log "Requesting admin test token..."
    ADMIN_TOKEN=$(curl -sf -X POST "$API_BASE/__test/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"wallet":"0xadmin_super","role":"admin_super"}' \
        2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || true)
    if [ -z "$ADMIN_TOKEN" ]; then
        log "WARNING: Could not get admin token. Workload generator may 401."
    else
        log "Admin token acquired."
    fi
fi
export ADMIN_TOKEN
export API_BASE

# ── Phase 5: Start Node Simulator ──
log "Starting node simulator (10 nodes, 30s heartbeat)..."
node scripts/simulate_nodes.js > "$LOGS_DIR/node_simulator.log" 2>&1 &
SIM_PID=$!
echo "$SIM_PID" >> "$PIDS_FILE"
log "Node simulator PID: $SIM_PID"

# ── Phase 6: Start Workload Generator ──
log "Starting workload generator (20 ops/s)..."
node scripts/generate_workloads.js > "$LOGS_DIR/workload_generator.log" 2>&1 &
WL_PID=$!
echo "$WL_PID" >> "$PIDS_FILE"
log "Workload generator PID: $WL_PID"

# ── Phase 7: Run for Duration ──
log ""
log ">>> Test running for ${DURATION_HOURS} hours. <<<"
log ">>> Press Ctrl+C to stop early. <<<"
log ""

START_TIME=$(date +%s)
REPORT_INTERVAL=3600  # report every hour

while true; do
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ "$ELAPSED" -ge "$DURATION_SECONDS" ]; then
        log "Duration reached ($DURATION_HOURS hours). Stopping test."
        break
    fi

    # Hourly health check and report
    HOURS_ELAPSED=$(( ELAPSED / 3600 ))
    sleep "$REPORT_INTERVAL" &
    SLEEP_PID=$!
    echo "$SLEEP_PID" >> "$PIDS_FILE"
    wait "$SLEEP_PID" 2>/dev/null || break

    # Check if child processes are still alive
    if ! kill -0 "$SIM_PID" 2>/dev/null; then
        log "WARNING: Node simulator died. Restarting..."
        node scripts/simulate_nodes.js >> "$LOGS_DIR/node_simulator.log" 2>&1 &
        SIM_PID=$!
        echo "$SIM_PID" >> "$PIDS_FILE"
    fi

    if ! kill -0 "$WL_PID" 2>/dev/null; then
        log "WARNING: Workload generator died. Restarting..."
        node scripts/generate_workloads.js >> "$LOGS_DIR/workload_generator.log" 2>&1 &
        WL_PID=$!
        echo "$WL_PID" >> "$PIDS_FILE"
    fi

    log "Checkpoint: ${HOURS_ELAPSED}h elapsed, generating interim report..."
    node scripts/generate_runtime_report.js 2>&1 | tee -a "$LOGS_DIR/reports.log"
    cp "$LOGS_DIR/runtime_report.json" "$LOGS_DIR/runtime_report_${HOURS_ELAPSED}h.json" 2>/dev/null || true
done

# ── Phase 8: Final Report ──
log ""
log "Generating final runtime report..."
node scripts/generate_runtime_report.js 2>&1 | tee "$LOGS_DIR/final_report.log"

log ""
log "============================================"
log "  72-Hour Test Complete"
log "  Final report: $LOGS_DIR/runtime_report.json"
log "  Simulator log: $LOGS_DIR/node_simulator.log"
log "  Workload log: $LOGS_DIR/workload_generator.log"
log "  Hourly snapshots: $LOGS_DIR/runtime_report_*h.json"
log "============================================"
