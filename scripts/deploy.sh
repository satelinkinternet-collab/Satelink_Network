#!/usr/bin/env bash
# ============================================================================
# Satelink Production Deploy Script
# ============================================================================
#
# Stages:
#   1. Pre-flight checks (env, deps, Docker)
#   2. Build images
#   3. Run database migrations
#   4. Start stack
#   5. Run certification gate
#   6. Report
#
# Usage:
#   ./scripts/deploy.sh [--skip-build] [--skip-cert]
#
# Environment:
#   JWT_SECRET, DATABASE_URL, etc. must be set in .env
# ============================================================================

set -euo pipefail

SKIP_BUILD=false
SKIP_CERT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build) SKIP_BUILD=true; shift;;
        --skip-cert) SKIP_CERT=true; shift;;
        *) echo "Unknown flag: $1"; exit 1;;
    esac
done

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $*"; }
die() { log "FATAL: $*"; exit 1; }

log "============================================"
log "  Satelink Production Deploy"
log "============================================"

# ── Stage 1: Pre-flight Checks ──
log "Stage 1: Pre-flight checks..."

command -v docker >/dev/null 2>&1 || die "Docker not found"
command -v docker compose >/dev/null 2>&1 && COMPOSE="docker compose" || COMPOSE="docker-compose"
command -v node >/dev/null 2>&1 || die "Node.js not found"

# Check required env vars
if [ ! -f .env ] && [ ! -f .env.local ]; then
    die "No .env or .env.local found. Create one with required secrets."
fi

# Verify JWT_SECRET is set (source .env to check)
set -a
[ -f .env ] && source .env
[ -f .env.local ] && source .env.local
set +a

if [ -z "${JWT_SECRET:-}" ]; then
    die "JWT_SECRET is not set in .env"
fi

if [ -z "${DATABASE_URL:-}" ]; then
    die "DATABASE_URL is not set in .env"
fi

log "  Pre-flight: PASS"

# ── Stage 2: Build Images ──
if ! $SKIP_BUILD; then
    log "Stage 2: Building Docker images..."
    $COMPOSE build 2>&1 | tail -5
    log "  Build: COMPLETE"
else
    log "Stage 2: Skipped (--skip-build)"
fi

# ── Stage 3: Start Stack ──
log "Stage 3: Starting Docker stack..."
$COMPOSE up -d 2>&1 | tail -5

# Wait for API health
log "  Waiting for API to become healthy..."
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
    STATUS=$(curl -sf "http://localhost:8080/health" 2>/dev/null | grep -o '"status":"ok"' || true)
    if [ -n "$STATUS" ]; then
        log "  API healthy after ${i} attempts"
        break
    fi
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        log "  API failed to become healthy. Dumping logs:"
        $COMPOSE logs api --tail=30
        die "API health check failed"
    fi
    sleep 3
done

# ── Stage 4: Run Certification ──
if ! $SKIP_CERT; then
    log "Stage 4: Running certification gate..."
    mkdir -p logs

    if node scripts/certify_satelink.js --api=http://localhost:8080; then
        log "  Certification: PASS"
    else
        log "  Certification: FAIL"
        log ""
        log "  Deploy ABORTED. Fix issues before deploying."
        log "  Report: logs/certification_report.json"
        $COMPOSE logs api --tail=20
        exit 1
    fi
else
    log "Stage 4: Skipped (--skip-cert)"
fi

# ── Stage 5: Report ──
log ""
log "============================================"
log "  Satelink Deploy: SUCCESS"
log "============================================"
log ""
log "  Services:"
log "    API:       http://localhost:8080"
log "    Dashboard: http://localhost:3000"
log "    Grafana:   http://localhost:3001"
log ""
log "  Commands:"
log "    View logs:  $COMPOSE logs -f"
log "    Stop:       $COMPOSE down"
log "    Cert:       node scripts/certify_satelink.js"
log "    Soak test:  npm run soak-test"
log ""
