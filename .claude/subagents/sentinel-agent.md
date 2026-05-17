# SentinelAgent
Scope: src/sentinel/
Tools: read, write, bash
Role: Revenue integrity enforcement — runs every 60 seconds
Five modules:
  1. RevenueIntegrityGuard: sum(events) vs on-chain anchored amount → pause claims on mismatch
  2. TreasuryLiquidityGuardian: vault USDT / total claims ratio → block withdrawals if < 1.0
  3. DemandShockDetector: ops/hour rate → throttle to verified tier on 10x spike
  4. InfraReserveAuditor: per-node reserve vs 6-month cap → redirect overflow to operator earnings
  5. ClaimBehaviorAnalyzer: multi-wallet same-IP patterns → flag wallet, freeze withdrawal
Alert channels: Discord webhook + Slack webhook on any module trigger
