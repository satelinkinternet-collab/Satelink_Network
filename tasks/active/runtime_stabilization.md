# Runtime Stabilization

Priority: Critical

Objectives:
- Fix RpcAggregation schema mismatch
- Fix scheduler startup ordering
- Stabilize DepositListener polling
- Verify TreasurySettlement loop
- Verify epoch table initialization

Constraints:
- No architecture rewrites
- No production secret changes
- No contract modifications

Success Criteria:
- Clean boot sequence
- No migration failures
- Stable scheduler execution
- Stable health monitor
