# Why Dashboard ≠ Wallet: Satelink Financial Truth Report

**Date**: May 2026
**Status**: Production Truth Audit Phase 2

---

## Executive Summary

The Satelink dashboard displays **metered usage value** — the sum of all RPC calls priced and recorded in `revenue_events_v2`. This number represents **potential revenue**, not **collected cash**.

**Key Finding**: The system can measure value but cannot yet prove collected cash flow.

---

## The 6 Financial States

| State | Table | Meaning | Dashboard Shows |
|-------|-------|---------|-----------------|
| **Metered** | `revenue_events_v2` | Usage recorded, priced | ✅ Yes |
| **Allocated** | `epoch_ledger` | Epoch closed, splits calculated | ✅ Yes (partial) |
| **Unpaid** | `epoch_earnings` | Owed to wallets, not distributed | ✅ Yes |
| **Treasury Real** | On-chain USDT | Actual USDT in treasury | ✅ Yes (new) |
| **Withdrawable** | MIN(unpaid, treasury) | What can actually be claimed | ✅ Yes (new) |
| **Claimed** | `node_claims` | USDT actually transferred | ⚠️ Often 0 |

---

## The Pipeline

```
revenue_events_v2  →  epoch_ledger  →  epoch_earnings  →  settlement_batches  →  node_claims
     (metered)         (allocated)       (unpaid)           (pending)           (claimed)
```

**Current Production State** (as of audit):
- Metered: ~155.49 USDT
- Treasury: ~0.65 USDT
- Claims: 0

**Conclusion**: Value is being **measured** but not **collected** or **distributed**.

---

## Why Dashboard ≠ Wallet

### 1. Metered ≠ Invoiced
Revenue events record usage. No invoice is sent. No payment is requested.

### 2. Allocated ≠ Funded
Epochs close and calculate 50/30/20 splits. But this is accounting math, not fund transfer.

### 3. Unpaid ≠ Payable
`epoch_earnings` with status=UNPAID means "we owe this". But if treasury has $0.65 and we owe $2.96, withdrawals are blocked.

### 4. Settlement Job May Not Be Running
If `settlement_batches` has 0 confirmed entries, the settlement job is either:
- Not deployed
- Not scheduled
- Failing silently

### 5. Treasury Not Funded
The treasury address must hold USDT to pay out claims. If it's empty, no one can withdraw.

---

## How to Verify

### Check Pipeline Health
```bash
curl https://rpc.satelink.network/api/financial/truth
```

### Response Shape
```json
{
  "metered_value_usdt": 155.49,
  "allocated_value_usdt": 150.00,
  "unpaid_value_usdt": 2.97,
  "treasury_real_usdt": 0.65,
  "withdrawable_now_usdt": 0.65,
  "claimed_total_usdt": 0.00,
  "cash_conversion_pct": 0.00,
  "status": "treasury_constrained"
}
```

### Key Metrics
- `cash_conversion_pct = 0%` means no metered value has become collected revenue
- `status = treasury_constrained` means unpaid > treasury
- `status = metered_only` means claims = 0 despite metered > 0

---

## Bottleneck Detection

The `/api/financial/truth` endpoint includes a `pipeline` object that traces each stage:

```json
{
  "pipeline": {
    "revenue_events_v2": { "count": 5184000, "sum_usdt": 155.49 },
    "epoch_ledger": { "open": 1, "closed": 0, "total_revenue": 0 },
    "epoch_earnings": { "unpaid": 0, "paid": 0 },
    "settlement_batches": { "pending": 0, "confirmed": 0 },
    "node_claims": { "count": 0, "sum_usdt": 0 },
    "bottleneck": "epoch_ledger",
    "bottleneck_reason": "No epochs have been closed (aggregation not running)"
  }
}
```

---

## Root Causes

### If bottleneck = `epoch_ledger`
- Epoch aggregation job not running
- Run: `npm run job:close-epoch` or deploy scheduler

### If bottleneck = `epoch_earnings`
- Epoch closed but no nodes were active
- Check `registered_nodes` has `status = 'active'`

### If bottleneck = `settlement`
- Earnings exist but settlement job not executing
- Check `settlement_batches` for pending entries
- Check settlement job logs

### If bottleneck = `claims`
- Payments marked but no on-chain claims
- Treasury may be empty
- ClaimsContract may not have USDT allowance

---

## Warnings Shown in Dashboard

| Condition | Warning |
|-----------|---------|
| `treasury < unpaid` | ⚠️ Treasury constrained — withdrawals limited by available USDT |
| `claimed = 0 && metered > 0` | ⚠️ Usage measured but not converted into collected revenue |
| `treasury = 0 && unpaid > 0` | 🔴 CRITICAL: Unpaid earnings exist but treasury has zero USDT |

---

## What Needs to Happen

1. **Fund Treasury**: Transfer USDT to treasury address
2. **Run Epoch Close**: Execute epoch aggregation job
3. **Run Settlement**: Execute settlement batch job
4. **Verify Claims**: Check ClaimsContract has USDT allowance

---

## New Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/financial/truth` | Canonical source of all 6 financial metrics |
| `GET /api/settlement/history` | Last 10 epochs with settlement status |
| `GET /api/settlement/epoch/:id` | Single epoch detail with event count |

---

## Files Changed in This Audit

- `apps/api/src/services/financial/truth.js` — New canonical endpoint
- `apps/api/app_factory.mjs` — Registered `/api/financial` router
- `apps/web/src/components/financial/FinancialTruthPanel.tsx` — New dashboard panel
- `apps/web/src/components/financial/FinancialBadge.tsx` — Added ALLOCATED, SETTLED badges
- `apps/web/src/app/dashboard/admin/page.tsx` — Uses FinancialTruthPanel
- `scripts/diagnose_settlement_pipeline.sql` — SQL diagnostic queries

---

## Summary

**Dashboard shows metered value. Wallet shows collected USDT. These are different things.**

Until:
1. Treasury is funded
2. Epoch jobs run
3. Settlement executes
4. Claims are processed

...the dashboard will show earnings, but wallets will remain empty.

The new `/api/financial/truth` endpoint makes this transparent. The `status` field tells you exactly where the pipeline is stuck.
