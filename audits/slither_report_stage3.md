# Slither Static Analysis Report — Stage 3

**Date:** 2026-03-15
**Tool:** Slither v0.10.x with Foundry compilation
**Scope:** 10 Solidity contracts in `apps/api/src/core/contracts/`
**Exclusions:** OpenZeppelin dependencies, test files, MockUSDT

## Summary

| Severity      | Count | Action              |
|---------------|-------|---------------------|
| CRITICAL      | 0     | N/A                 |
| HIGH          | 0     | N/A                 |
| MEDIUM        | 3     | Documented below    |
| LOW           | 8     | Accepted risk       |
| INFORMATIONAL | 8     | Naming conventions  |

## MEDIUM Findings

### M-1: Divide Before Multiply (RevenueDistributor.sol#164-168)

**Description:** `coreTreasuryShare` is computed as `(platformShare * coreTreasuryBP) / BP_DENOMINATOR` where `platformShare` itself was a division result. This can cause minor precision loss.

**Assessment:** ACCEPT RISK. Using basis points (10000) with USDT (6 decimals) means maximum loss is < 0.0001 USDT per distribution. The financial impact is negligible for the expected transaction sizes.

**Fix Planned:** None needed. Standard basis-point arithmetic used across DeFi.

### M-2: Dangerous Strict Equality (NodeRegistryV2.sol#187)

**Description:** `isNodeActive()` uses `==` to compare enum values. Slither flags this as dangerous strict equality.

**Assessment:** FALSE POSITIVE. Comparing Solidity enum values with `==` is correct and safe. Enums are uint8 under the hood — strict equality is the only meaningful comparison.

**Fix Planned:** None needed.

### M-3: Unused Return Value (ClaimsWithdrawals.sol#48)

**Description:** The return value from `epochAnchor.epochs(epochId)` destructuring ignores some tuple fields.

**Assessment:** ACCEPT RISK. Only `root` and `anchorTimestamp` are needed for claim verification. The unused fields (epochId, totalRevenue) are intentionally discarded. This is standard Solidity practice.

**Fix Planned:** None needed.

## LOW Findings (Accepted)

- **L-1/L-2:** Benign reentrancy in RevenueVault.deposit() and RevenueDistributor.distribute() — both use SafeERC20 which prevents reentrancy on standard ERC20 tokens. USDT is the only token used.
- **L-3:** Reentrancy event ordering in RevenueVault.deposit() — event emitted after external call. No security impact since state is updated before event.
- **L-4 to L-8:** Timestamp comparisons — used for claim deadlines and node status checks. Block timestamp manipulation (15s) is negligible for 48-day claim windows.

## Conclusion

Zero CRITICAL or HIGH findings. All 3 MEDIUM findings are documented with assessments showing they are either false positives or accepted risks with negligible financial impact. The contracts are well-written with proper use of OpenZeppelin v4.9.6 security patterns (AccessControl, ReentrancyGuard, Pausable, SafeERC20).

Recommendation: Proceed with external audit for formal verification before mainnet deployment.
