# Deploying to Fuse Networks with GitHub Actions & OpenZeppelin Defender

This guide explains the deployment workflow for the Satelink Network contracts, which is designed to **require exactly zero laptops or local private keys** for administration and deployment, vastly improving security.

## Summary

* **Testing:** The CI workflow (`.github/workflows/contracts-ci.yml`) automatically runs tests on every PR and push to `main` or specific WIP branches.
* **Deployment (CI):** The deploy workflow (`.github/workflows/contracts-deploy.yml`) is triggered manually (`workflow_dispatch`). It does not use raw private keys. Instead, it interacts with OpenZeppelin Defender.
* **Transaction Execution:** OpenZeppelin Defender Relayer securely stores the deployment/admin keys and processes the actual transaction submission on-chain.

## 1. Required GitHub Secrets

To enable the `contracts-deploy.yml` workflow, the following secrets must be added to your GitHub repository (Settings > Secrets and variables > Actions):

* `DEFENDER_KEY`: Your OpenZeppelin Defender API Key.
* `DEFENDER_SECRET`: Your OpenZeppelin Defender API Secret.

*(Optional but recommended)* Provide custom RPC endpoints if you wish to bypass the public endpoints:
* `FUSE_MAINNET_RPC_URL`: e.g. `https://rpc.fuse.io`
* `FUSE_SPARKNET_RPC_URL`: e.g. `https://rpc.fusespark.io`

**Crucially, NO `PRIVATE_KEY` should be stored in GitHub Secrets.**

## 2. Setting Up Defender

1. Log into your OpenZeppelin Defender account.
2. Navigate to **Manage > Relayers** and construct a Relayer for Fuse Mainnet (or Sparknet).
3. Fund the generated Relayer Ethereum address with FUSE tokens (for gas).
4. Go to **Manage > API Keys** and generate a team-level or relayer-specific API key pair. Save these as the `DEFENDER_KEY` and `DEFENDER_SECRET` GitHub Secrets mentioned above.

## 3. How to Deploy (Triggering GitHub Actions)

To initiate a deployment:

1. Go to the "Actions" tab in the GitHub repository.
2. Select the `contracts-deploy` workflow on the left sidebar.
3. Click the "Run workflow" drop-down on the right side.
4. Select the desired branch (usually `main`) and the target network (`fuse_sparknet` or `fuse_mainnet`).
5. Click **Run workflow**.

The workflow will check out the code, install dependencies, compile the contracts, and eventually call the deployment script using the Defender relayer.

## 4. Backend Environment Variable Requirements

For the backend (Node.js API) to interact with the deployed contracts securely, it must also be configured with appropriate environment variables corresponding to the network:

* `RELAYER_API_KEY` or `DEFENDER_KEY`
* `RELAYER_API_SECRET` or `DEFENDER_SECRET`
* `SETTLEMENT_CONTRACT_ADDRESS`: The address output from the CI deployment.

The settlement adapters in the backend are designed to route transactions through Defender using these credentials rather than signing locally.
