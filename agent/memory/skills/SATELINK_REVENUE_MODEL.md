# SATELINK REVENUE MODEL
# Reference for REVENUE_WORKER, BACKEND_WORKER, and CEO.

---

## PRICING (current)

RPC call: ~$0.000001 per call (varies by method complexity)
MEV relay: premium pricing (not yet live)
AI inference: per token (not yet live)
Bandwidth: per GB (not yet live)

Free tier: 500 calls/day per IP. No charge.
After limit: requires USDT deposit to continue.

---

## DEPOSIT AND CREDIT FLOW

User deposits USDT to wallet via Polygon mainnet transaction.
DepositListener detects on-chain transfer, credits account in DB.
Credits deducted per API call based on op_type pricing.
Low balance warning at 10% remaining.
Zero balance → 402 response, no service.

---

## EPOCH LIFECYCLE

Duration: configurable (currently time-based, running autonomously)
Current epoch: ~4757+ as of 2026-05-29
States: OPEN → CLOSING → FINALIZED → CLAIMS_OPEN → ARCHIVED

OPEN: revenue events accumulate
CLOSING: no new events, finalization begins
FINALIZED: ledger hash computed, Merkle root submitted to Polygon
CLAIMS_OPEN: operators can claim for 48 days
ARCHIVED: unclaimed amounts returned to treasury

---

## REVENUE SPLIT (immutable — requires governance to change)

  operator_pool = epoch_revenue * 0.50
  treasury_pool = epoch_revenue * 0.30
  infra_pool    = epoch_revenue * 0.20

Changes to split ratios require CEO approval + governance log entry.
Never adjust without explicit authorization.

---

## WHAT REVENUE_WORKER MUST NEVER DO

- Modify a FINALIZED epoch (immutable once ledger hash set)
- Change the 50/30/20 split without CEO approval + governance log
- Process claims for expired windows (48-day hard cutoff)
- Allow infra reserve to exceed 6-month cost cap
- Delete revenue_events_v2 records (append-only table)

---

## FRAUD DETECTION RULES

Same IP, multiple wallets: flag for review, freeze claims (preserve earnings)
Micro-claim spam: minimum claim amount enforced
Impossible operation rate: if ops/second exceeds node hardware capability → flag
Canary jobs: known-answer test tasks injected to verify node honesty

---

## REVENUE TARGETS

Current: $0/hr (free tier only — no paid users yet)
Target by June 30, 2026: $500/hr autonomous M2M revenue
Path to target:
  Step 1: Chainlist PR merged → organic M2M discovery (HUMAN ACTION needed)
  Step 2: First IP crosses 500/day limit → upgrade prompt
  Step 3: First USDT deposit confirmed → first paid call
  Step 4: 62 near-limit IPs convert → recurring revenue
  Step 5: MEV endpoint launch → premium revenue tier

---

## CONVERSION FUNNEL (as of 2026-05-29)

Free tier IPs active: 1,611
Near limit (90%+): 62
At limit (100%): unknown (check CONVERSIONS.md)
Paid customers: 0 (conversion not yet triggered)
