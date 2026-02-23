# Deploying to Fuse with OpenZeppelin Defender

This guide covers **laptop-free, CI-driven deployments** to Fuse Sparknet (testnet)
and Fuse Mainnet using OpenZeppelin Defender Relayers and GitHub Actions.

No private keys are stored in the repo. All secrets live in GitHub Actions or
Defender's encrypted secret store.

---

## Table of Contents

1. [Architecture overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Set up a Defender Relayer](#1-set-up-a-defender-relayer)
4. [Configure GitHub Secrets](#2-configure-github-secrets)
5. [Deploy via GitHub Actions (manual trigger)](#3-deploy-via-github-actions-manual-trigger)
6. [Smoke-test on Sparknet first](#4-smoke-test-on-sparknet-first)
7. [Local deployment (dev / emergency)](#5-local-deployment-dev--emergency)
8. [Verify deployment](#6-verify-deployment)
9. [Contract addresses checklist](#7-contract-addresses-checklist)

---

## Architecture overview

```
GitHub Actions
  │
  ├─ npm ci + npx hardhat compile
  ├─ npx hardhat test                  (Hardhat in-memory network)
  ├─ npx hardhat run smoke_settlement  (Hardhat in-memory network)
  │
  └─ npx hardhat run deploy_settlement --network sparknet   (testnet gate)
       │
       └─ (manual approval) → --network fuse               (mainnet)
            │
            └─ Defender Relayer (signs & submits txs, no raw key in CI)
```

The Defender **Relayer** acts as the funded signing account. Your CI workflow
passes `PRIVATE_KEY` as the exported Relayer key — or, if you adopt the
`@openzeppelin/defender-sdk` deploy API in the future, passes only
`DEFENDER_API_KEY` / `DEFENDER_API_SECRET`.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| OpenZeppelin Defender account | [defender.openzeppelin.com](https://defender.openzeppelin.com) — free tier works |
| GitHub repository write access | To add secrets under Settings → Secrets |
| FUSE tokens (for gas) | ~0.1 FUSE covers most deployment batches |

---

## 1. Set up a Defender Relayer

### Sparknet (testnet) Relayer

1. Log in to [OpenZeppelin Defender](https://defender.openzeppelin.com/).
2. Go to **Manage → Relayers → Create Relayer**.
3. Fill in:
   - **Name**: `Satelink Sparknet Deployer`
   - **Network**: `Fuse Testnet` (chainId 123)
4. Click **Create**.
5. On the relayer detail page, click **Create API Key**.
   Save the **API Key** and **Secret Key** — the secret is shown **once only**.
6. Note the **Relayer Address** — you need to fund it with Sparknet FUSE.

> **Getting testnet FUSE:** Visit the [Fuse Sparknet Explorer](https://explorer.fusespark.io)
> and use the faucet linked in the sidebar, or ask in the Fuse Discord.

### Mainnet Relayer

Repeat the steps above with:
- **Name**: `Satelink Fuse Mainnet Deployer`
- **Network**: `Fuse` (chainId 122)
- Fund with real FUSE tokens (bridge from another chain or buy on an exchange).

---

## 2. Configure GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions →
New repository secret** and add:

| Secret name | Value | Used for |
|---|---|---|
| `PRIVATE_KEY` | Exported private key of the Defender Relayer account | `--network sparknet` / `--network fuse` in Hardhat |
| `DEFENDER_API_KEY` | Relayer API Key (from step 1) | Future Defender SDK / upgrade scripts |
| `DEFENDER_API_SECRET` | Relayer Secret Key (from step 1) | Future Defender SDK / upgrade scripts |
| `USDT_ADDRESS` | Live USDT contract address on Fuse Mainnet | Skips MockUSDT deploy on mainnet |

> **Important:** `PRIVATE_KEY` must be the hex private key of the Defender Relayer's
> EOA address (available via Manage → Relayers → Export Private Key).
> Never commit this value to the repository.

---

## 3. Deploy via GitHub Actions (manual trigger)

Add this workflow to `.github/workflows/deploy-settlement.yml`:

```yaml
name: Deploy Settlement — Fuse

on:
  # Manual trigger with network selection.
  # Always smoke-test on Sparknet before approving mainnet.
  workflow_dispatch:
    inputs:
      network:
        description: "Target network"
        required: true
        default: sparknet
        type: choice
        options:
          - sparknet
          - fuse

jobs:
  deploy:
    name: Deploy to ${{ github.event.inputs.network }}
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.network == 'fuse' && 'mainnet' || 'testnet' }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: "22.x"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Compile contracts
        run: npx hardhat compile

      - name: Deploy settlement contracts
        run: npx hardhat run scripts/deploy_settlement.js --network ${{ github.event.inputs.network }}
        env:
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}

      - name: Smoke test on deployed network
        run: npx hardhat run scripts/smoke_settlement.js --network ${{ github.event.inputs.network }}
        env:
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          # On mainnet, set USDT_ADDRESS to skip MockUSDT deploy and use live token
          USDT_ADDRESS: ${{ secrets.USDT_ADDRESS }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: compiled-contracts-${{ github.event.inputs.network }}
          path: artifacts/
          retention-days: 30
```

### GitHub Environments (optional but recommended)

Create two GitHub Environments (**Settings → Environments**):

- **testnet** — no protection rules required
- **mainnet** — add **Required reviewers** (yourself + one teammate) so every
  mainnet deploy needs a manual approval click before secrets are injected

---

## 4. Smoke-test on Sparknet first

Before any mainnet deployment, always run the smoke test against Sparknet:

```bash
# From your local machine (requires .env with PRIVATE_KEY)
npx hardhat run scripts/smoke_settlement.js --network sparknet
```

Expected output (abbreviated):
```
═══════════════════════════════════════════════════════
  SMOKE TEST — Settlement Contracts
  Network: sparknet
═══════════════════════════════════════════════════════

Step 1 · Deploy settlement contracts
  MockUSDT deployed to: 0x...
  RevenueVault deployed to: 0x...
  ClaimsContract deployed to: 0x...

Step 2 · Transfer vault ownership → ClaimsContract
  ✓ vault.owner() = 0xClaimsContractAddress

Step 3 · Deposit USDT into vault
  ✓ Vault balance = 1000.0 USDT

Step 4 · Create claim (post sample root)
  ✓ claimId = 0x...

Step 5 · Claim reward (update internal ledger)
  ✓ userBalances[claimant] = 100.0 USDT

Step 6 · Withdraw funds (vault → claimant wallet)
  ✓ Received 100.0 USDT
  ✓ userBalances[claimant] = 0 (cleared)

═══════════════════════════════════════════════════════
  SMOKE TEST PASSED ✓
═══════════════════════════════════════════════════════
```

If smoke passes on Sparknet, trigger the `workflow_dispatch` for `fuse`.

---

## 5. Local deployment (dev / emergency)

If you need to deploy from your laptop:

```bash
# 1. Copy and fill in your secrets
cp .env.example .env
# Set: PRIVATE_KEY=0x<your-relayer-exported-key>
# Set: USDT_ADDRESS=<live-USDT-on-fuse>   (mainnet only; omit for MockUSDT)

# 2. Testnet — deploy then smoke-test
npx hardhat run scripts/deploy_settlement.js --network sparknet
npx hardhat run scripts/smoke_settlement.js  --network sparknet

# 3. Mainnet — deploy then smoke-test
npx hardhat run scripts/deploy_settlement.js --network fuse
npx hardhat run scripts/smoke_settlement.js  --network fuse
```

> **Note on `USDT_ADDRESS`:** On Fuse Mainnet, USDT is bridged from Ethereum.
> Set `USDT_ADDRESS` to the canonical Fuse USDT contract address so
> `deploy_settlement.js` skips the MockUSDT deploy and wires the real token.

---

## 6. Verify deployment

After any deployment, confirm contract code is on-chain:

```bash
# Replace <RPC> with https://rpc.fusespark.io or https://rpc.fuse.io
# A result longer than "0x" means the contract is deployed.
curl -s -X POST <RPC> \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["<CONTRACT_ADDRESS>","latest"],"id":1}' \
  | jq -r '.result | length'
# Expected: a large number (not 2, which would be just "0x")
```

Or browse the block explorers:
- Testnet: `https://explorer.fusespark.io/address/<CONTRACT_ADDRESS>`
- Mainnet: `https://explorer.fuse.io/address/<CONTRACT_ADDRESS>`

---

## 7. Contract addresses checklist

Record deployed addresses after each run. Do **not** commit private keys or
mnemonics alongside these addresses.

| Contract | Sparknet address | Mainnet address |
|---|---|---|
| MockUSDT (or live USDT) | — | — |
| RevenueVault | — | — |
| ClaimsContract | — | — |

To dump the ABI for frontend / SDK integration:

```bash
cat artifacts/contracts/ClaimsContract.sol/ClaimsContract.json | jq '.abi'
```

The `artifacts/` directory is uploaded as a CI artifact (retained 30 days) by
the deploy workflow and 7 days by the test workflow — download it from the
GitHub Actions run summary if needed.
