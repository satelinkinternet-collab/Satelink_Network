# SATELINK REVENUE FLOW

## Core Philosophy

Satelink is revenue-first infrastructure.

No rewards exist unless real revenue exists.

All accounting is based on real USDT-denominated activity.

---

# Full Economic Pipeline

Client Request
→ Gateway API
→ Operations Engine
→ executeOp()
→ revenue_events_v2
→ Epoch Finalization
→ Earnings Calculation
→ Claim
→ Withdraw
→ USDT Settlement

---

# Step 1 — Client Request

Revenue enters through:

- RPC requests
- AI inference
- automation jobs
- webhooks
- scraping
- bandwidth relay

---

# Step 2 — Gateway Processing

Gateway APIs validate:

- API keys
- rate limits
- pricing
- workload structure

Supported gateways:

- /rpc/*
- /v1/ai
- /v1/jobs
- /v1/webhooks

---

# Step 3 — Operations Engine

executeOp() performs:

- workload validation
- pricing calculation
- rate limiting
- revenue recording

All revenue events are recorded into:

revenue_events_v2

---

# Step 4 — Scheduler + Node Execution

Scheduler selects nodes using:

- reputation
- latency
- capability
- workload compatibility

Routing order:

community nodes
→ founder nodes
→ external providers

---

# Step 5 — Revenue Event Recording

Every completed operation creates:

- revenue event
- workload metrics
- node contribution metrics

---

# Step 6 — Epoch Finalization

Epoch Engine:

- aggregates revenue
- calculates earnings
- finalizes accounting
- locks epoch state

---

# Step 7 — Revenue Distribution

Revenue split:

50% → Node Operators
30% → Platform
20% → Distribution

---

# Step 8 — Claims

Operators must actively claim rewards.

Claim lifecycle:

UNPAID
→ CLAIMED
→ WITHDRAWN

---

# Step 9 — Withdrawals

Withdrawals trigger:

- settlement verification
- contract interaction
- USDT transfer

---

# Settlement Layer

Smart contracts:

- RevenueVault
- SplitEngine
- ClaimsContract
- RevenueDistributor

---

# Settlement Chains

Supported:

- Polygon PoS (mainnet, chainId 137)
- Polygon Amoy (testnet, chainId 80002)

---

# Core Accounting Principles

- no fake emissions
- no artificial rewards
- no hidden treasury minting
- revenue before rewards
- immutable epoch accounting

---

# Long-Term Goal

Create a fully autonomous infrastructure economy powered by real machine demand.

