# Satelink Repository Governance Zones

## Zone 3 — Internal Private (never publish to public repo)

The following files and directories are classified INTERNAL PRIVATE.
They must never appear in any public GitHub repository.
They contain operational security logic that would enable platform abuse if exposed.

### Files
- `apps/api/src/monitoring/` — SLA engine, replay engine, ops monitoring
- `apps/api/src/core/operations_engine.js` — Core pricing, surge, and rate limit logic
- `apps/api/src/workloads/auto_ops_engine.js` — Autonomous revenue operations engine
- `apps/api/src/monitoring/sla_engine.js` — SLA breach thresholds and circuit breaker triggers
- `apps/api/src/scheduler/` — Epoch boundary timing and automation intervals
- `apps/api/src/integrations/nodeops.js` — Managed node vendor integration
- `apps/api/src/ops-agent/` — Multi-agent orchestration framework
- `apps/api/src/gateway/pages/admin/` — Admin endpoint surface
- `apps/web/src/app/admin*/` — Admin dashboard pages
- `apps/dashboard/src/app/admin/` — Admin dashboard pages
- `scripts/security/` — CI security gate scripts

### Why these are sealed
**Sentinel thresholds**: publishing enables adversaries to craft operations that
stay exactly below every detection trigger.

**Operations Engine pricing**: publishing enables free-execution attacks.

**Reputation weights**: publishing enables optimized Sybil farming.

**Security gates**: publishing reveals monitored vs unmonitored attack vectors.

**Admin routes**: publishing enables targeted attacks on high-privilege endpoints.

## Zone 4 — Never Commit (secrets)
See .gitignore for the complete list. Rotate quarterly.

### Environment variables that must never be committed:
- `JWT_SECRET`
- `POLYGON_SIGNER_KEY`
- `SETTLEMENT_EVM_SIGNER_PRIVATE_KEY`
- `MASTER_ADMIN_TOKEN`
- `ADMIN_API_KEY`
- Real reputation weights (use defaults in code, override in prod via env)
