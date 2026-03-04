# Satelink Execution Tracker

## Current Branch:
integration/full-product

## Stage Status

### Stage 1: Branch Consolidation
- [x] 1.1 Create integration/full-product from main
- [ ] 1.2 Merge release/integration-1
- [ ] 1.3 Merge fix/e2e-phase1-stabilize-boot-db
- [ ] 1.4 Cherry-pick JWT issuer fix from claude/keen-swanson
- [ ] 1.5 Cherry-pick 47 missing tables from claude/keen-swanson
- [ ] 1.6 Merge pr/permissionless-onboarding
- [ ] 1.7 Merge pr/economics-waterfall
- [ ] 1.8 Merge pr/nodeops-adapter
- [ ] 1.9 Merge hardening/sandbox
- [ ] 1.10 Cherry-pick Docker configs from claude/thirsty-goldberg
- [ ] 1.11 Cherry-pick live/sim mode from claude/thirsty-goldberg
- [ ] 1.12 Resolve conflicts, npm install, verify boot

### Stage 2: Smart Contract Hardening
- [ ] 2.1 Verify ClaimsContract.sol security
- [ ] 2.2 Rewrite SplitEngine.sol
- [ ] 2.3 Rewrite RevenueVault.sol
- [ ] 2.4 Create EligibilityPolicy.sol
- [ ] 2.5 Create GovernanceTimelock.sol
- [ ] 2.6 Write Foundry tests for all 7 contracts
- [ ] 2.7 forge build — zero warnings
- [ ] 2.8 forge test — all pass
- [ ] 2.9 Create deployment script
- [ ] 2.10 Update contracts CI workflow

### Stage 3: Auth & Security Hardening
- [ ] 3.1 Remove hardcoded secret from api.ts
- [ ] 3.2 Remove hardcoded fallback from core/security.js
- [ ] 3.3 Remove JWT_SECRET fallback in env.js
- [ ] 3.4 Rewrite login page
- [ ] 3.5 Create register page
- [ ] 3.6 Add auth to operator dashboard
- [ ] 3.7 Add auth to distributor dashboard
- [ ] 3.8 Guard /__test routes in production
- [ ] 3.9 Add requireJWT to /usage/record
- [ ] 3.10 Create .env.example
- [ ] 3.11 Remove test file hardcoded secrets

### Stage 4: Backend Boot & API Wiring
- [ ] 4.1 Consolidate boot sequence
- [ ] 4.2 Implement /ledger/withdraw
- [ ] 4.3 Add missing Next.js rewrites
- [ ] 4.4 Create /admin-api/ledger/runs
- [ ] 4.5 Create /admin-api/logs
- [ ] 4.6 Create /admin-api/revenue/summary
- [ ] 4.7 Create /admin-api/security/alerts
- [ ] 4.8 Create /node-api/earnings
- [ ] 4.9 Create /dist-api/referrals
- [ ] 4.10 Verify /health endpoint

### Stage 5: Frontend Dashboard Wiring
- [ ] 5.1 Delete duplicate AuthContext.tsx
- [ ] 5.2 Wire /admin/ledger
- [ ] 5.3 Wire /admin/logs
- [ ] 5.4 Wire /admin/revenue
- [ ] 5.5 Wire /admin/security
- [ ] 5.6 Wire /admin/settings
- [ ] 5.7 Wire /admin/withdrawals
- [ ] 5.8 Wire /admin/rewards
- [ ] 5.9 Wire /node/earnings
- [ ] 5.10 Wire /builder/docs
- [ ] 5.11 Wire /builder/keys
- [ ] 5.12 Wire /builder/projects
- [ ] 5.13 Wire /distributor/referrals
- [ ] 5.14 Wire /admin/growth/retention

### Stage 6: Real-Time Data & SSE
- [ ] 6.1 Wire Node Dashboard to real APIs
- [ ] 6.2 Create /node-api/status endpoint
- [ ] 6.3 Create /stream/node SSE endpoint
- [ ] 6.4 Wire Admin Command Center real-time
- [ ] 6.5 Create /stream/admin SSE endpoint
- [ ] 6.6 Create Treasury Health Widget
- [ ] 6.7 Wire telemetry chart to real data
- [ ] 6.8 Create /node-api/telemetry endpoint
- [ ] 6.9 Wire system console to real logs
- [ ] 6.10 Add epoch countdown timer

### Stage 7: Testing & Quality Gate
- [ ] 7.1 Fix all backend tests
- [ ] 7.2 Run npm test — all pass
- [ ] 7.3 Create admin login E2E test
- [ ] 7.4 Create node operator E2E test
- [ ] 7.5 Create builder flow E2E test
- [ ] 7.6 Create claim/withdraw E2E test
- [ ] 7.7 Run Playwright E2E tests
- [ ] 7.8 Create production smoke script
- [ ] 7.9 Run smoke test
- [ ] 7.10 Run forge test
- [ ] 7.11 Run web tests
- [ ] 7.12 TypeScript check
- [ ] 7.13 ESLint check
- [ ] 7.14 Production build

### Stage 8: Cloud Deployment
- [ ] 8.1 Create production .env template
- [ ] 8.2 Create ecosystem.config.cjs for PM2
- [ ] 8.3 Create nginx.production.conf
- [ ] 8.4 Create deploy_production.sh
- [ ] 8.5-8.12 VPS setup (MANUAL)
- [ ] 8.13-8.16 Post-deployment verification

## Last Completed Task:
1.1 — Create integration/full-product from main

## Last Verified Stage:
None
