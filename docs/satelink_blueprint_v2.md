
SATELINK PHASE EXECUTION BLUEPRINT (DETAILED)

PHASE 1 — CRITICAL BLOCKERS
- Rotate all secrets (JWT, DB, API keys)
- Remove .env from git history
- Fix critical bugs:
  • operations_engine.js → fix db undefined
  • futures_escrow.js → add missing await
  • job_escrow.js → add missing await
- Security hardening:
  • Replace SHA256 with bcrypt (12 rounds)
  • Add CSRF protection
  • Lock CORS (no wildcard)
  • Remove /dev endpoints
  • Reduce JWT expiry (15 min)
- Database:
  • Add indexes (revenue_events_v2, registered_nodes, epoch_earnings)
  • Add CHECK constraints (amount >= 0)

PHASE 2 — PRODUCT COMPLETION
- Wallet connect (MetaMask / WalletConnect)
- Node setup wizard
- Settlement wiring (ethers.js → Fuse contracts)
- Payment pipeline (deposit + billing)
- Workload verification (remove simulated revenue)

PHASE 3 — PRODUCTION HARDENING
- Docker fixes (non-root user, resource limits)
- DB backups + Redis persistence
- CI/CD pipeline fixes
- Monitoring (Prometheus, Grafana dashboards)
- Database migrations + optimization

PHASE 4 — LAUNCH
- End-to-end testing
- Load testing (100+ nodes)
- Deploy contracts + backend
- Final security checklist
