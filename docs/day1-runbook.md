# Day 1 Runbook: Satelink Network Modes

## Introduction
The Satelink Network operates in two fundamental modes. Understanding the distinction is critical for safe day-to-day operations.

## How to run Simulation mode
1. Open the `.env` file at the root of the project.
2. Ensure `SATELINK_MODE=simulation` is set.
3. Start the server (e.g. `npm run dev` or `node server.js`).
4. The system will boot and print `Running in SIMULATION mode`.

## How to switch to Live mode
1. Open the `.env` file at the root of the project.
2. Set `SATELINK_MODE=live`. Ensure all required live environment variables are set (like `DATABASE_URL`, `JWT_SECRET`, `TREASURY_ADDRESS`, etc).
3. Restart the server. 
4. The system will boot and print `Running in LIVE mode`.

## What Simulation does / does not do
* **DOES:** Tracks operations, generates fake revenue, simulates epochs, and allows testing of the UI and internal mechanics without external consequence.
* **DOES NOT:** Interact with real smart contracts, settle real tokens, or expose dev/test routes that are shielded in live mode.

## What Live does / does not do
* **DOES:** Process real economic value, interact with live blockchain settlement adapters, and enforce strict security measures (blocking test/seed routes).
* **DOES NOT:** Allow fake or simulated data generation. It expects real RPC and AI workloads for revenue.

## Claim ≠ Withdraw explanation
* **Claim:** The process of acknowledging and assigning earned revenue from a finalized epoch to a specific node operator's balance. This balance is still held by the platform.
* **Withdraw:** The actual transfer of the *claimed* balance from the platform Treasury into the node operator's external wallet.

## Liquidity Gating explanation
Withdrawals are gated by the available liquidity in the platform Treasury. Even if an operator has a "claimed" balance, a withdrawal request will safely fail if the Treasury does not currently have enough funds to honor the transaction.

## API Quick Checks
Test platform mode and core RPC route directly:
```bash
curl -s http://localhost:8080/api/mode | grep -Eo '"mode":"(live|simulation)"'
curl -s http://localhost:8080/rpc
```

## Safe Smoke Checks (Automated)
Satelink incorporates a read-only smoke testing routine capable of validating safe infrastructure boundaries without disrupting or writing logic into ledger databases. 

To execute the diagnostic:
```bash
API_BASE_URL=http://localhost:8080 node scripts/smoke_safezone.js
```

### Expected Flow
1. **Simulation Mode**: Verifies `/api/mode`, `/healthz`, `/api/runtime-info` and `/simulation/status` natively evaluating successfully.
2. **Live Mode**: Dynamically isolates the `/simulation` and `/__test` namespaces and gracefully logs a pass when a `403 Forbidden` firewall interceptor kicks in preventing analytics access.

For more comprehensive gating checks, see [Operator Flags & Readiness Gate](operator-flags.md).
