# Autonomous Ops Engine - Smoke Test Guide

This document outlines the verification steps for Phase N (Autonomous Operations).
The primary verification script is `scripts/smoke_phase_n_detailed.js`.

## Prerequisites
- Node.js environment
- SQLite database (`satelink.db`) initialized with `sql/layerN_autonomous.sql`.

## Test Scenarios Covered
1.  **Metric Seeding**: Injects high burn rate (150%) and stable revenue metrics.
2.  **Recommendation Generation**: Runs `AutoOpsEngine.runDailyJob()` to trigger the Recommendation Engine.
    - Verified: A `reward_adjust` recommendation is created with `status='pending'`.
3.  **Manual Execution**: Simulates an Admin accepting the recommendation via `executeRecommendation`.
    - Verified: Recommendation status changes to `executed`.
    - Verified: `system_config` is updated (`reward_multiplier_effective` drops from 1.0 to 0.9).
    - Verified: Audit log entry exists in `auto_actions_log`.
4.  **Safety Guardrails**: Enables `safe_mode` and attempts to execute another recommendation.
    - Verified: Execution is blocked with `Safety Guardrail: Execution blocked...`.

## How to Run
```bash
node scripts/smoke_phase_n_detailed.js
```

## Expected Output
```text
=== Phase N Detailed Smoke Test ===
[1] Running Recommendation Engine...
✅ Recommendation created: reward_adjust (ID: ...)
   Action: reduce_multiplier, Value: 10
[2] Executing Recommendation...
[AutoOps] Executing Recommendation...
✅ Recommendation status updated to 'executed'
✅ System config updated: reward_multiplier_effective = 0.9
✅ Audit log entry found
[3] Testing Safety Guardrail (Safe Mode)...
✅ Safe Mode blocked execution correctly
=== ALL TESTS PASSED ===
```
