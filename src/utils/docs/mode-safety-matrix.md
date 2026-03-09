# Mode Safety Matrix

The Satelink Network operates under two main modes: **Simulation** and **Live**. This document outlines the expected behavior of key system features across each mode.

| Feature / Component | `simulation` Behavior | `live` Behavior | Notes (Placeholders) |
|---------------------|-----------------------|-----------------|----------------------|
| **Settlement** | `SimulatedAdapter` generates mock transaction hashes and marks payouts complete. | Real external settlement adapters (e.g. EVM) are active. Blockchain transactions actually emit value. | If missing configs in live, adapters will fail health checks. |
| **API Endpoints** (`/__test`, `/dev`, `/seed`) | fully accessible for load testing and demo scenario setups. | **BLOCKED (403 Forbidden)** by central Live Guard. | Access denied via `liveGuard.js`. |
| **Dashboard UI** | All features enabled, including dummy operation toggles. | The "Danger Zone" buttons are locked. Tooltips will read "Disabled in LIVE mode." | `js/dashboard.js` fetches `/api/mode` at load. |
| **Network Node Onboarding** | Admins can use `/nodes/bootstrap-payment` to forge fake nodes and balances. | Node data represents real hardware registering into the network via staking. |  |
| **Epoch Execution** | The `OperationsEngine` iterates without hitting actual physical partner webhooks or verifying real AI completions. | Strictly enforces SLA logic and processes verified physical workloads to mint rewards. | |
| **Environment Values** | Soft warnings on missing variables. Fails gracefully. | Requires strictly configured `DATABASE_URL`, `TREASURY_ADDRESS`, and `JWT_SECRET`. | Checked via `validateEnvSoft()`. |
