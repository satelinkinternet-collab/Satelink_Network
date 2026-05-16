# Deploy New ClaimsContract (EIP-712 Version)

## Problem Summary

The deployed contract at `0xE475c53B88190FD2130dB1E37504991EFe283fb0`:
1. Uses **push model** (createClaim) from `apps/api/src/core/contracts/ClaimsContract.sol`
2. No address has `CLAIM_CREATOR_ROLE` to create claims
3. 4.93 USDT is stuck in the contract
4. No emergencyWithdraw function

The backend generates **EIP-712 signatures** expecting the pull model contract from `/contracts/ClaimsContract.sol`.

## Solution

Deploy the correct EIP-712 based ClaimsContract from `/contracts/ClaimsContract.sol`.

## Deployment Steps

### 1. Get Required Keys

```bash
# Need these environment variables:
DEPLOYER_PRIVATE_KEY=<key for 0x3b324B334E1e8ec926310e6716C97A9aF43b667A>
SETTLEMENT_EVM_SIGNER_PRIVATE_KEY=<backend signer key>
```

### 2. Deploy New Contract

```bash
cd /Users/pradeepjakuraa/satelink

# Install foundry if needed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy to Polygon mainnet
forge script script/DeployClaimsOnly.s.sol \
  --rpc-url https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY \
  --broadcast \
  --verify
```

### 3. Update Railway Environment

```bash
CLAIMS_CONTRACT_ADDRESS=<new contract address>
```

### 4. Fund New Contract

Transfer USDT to the new contract address for payouts.

### 5. Verify on Polygonscan

The new contract should be verified automatically if using `--verify` flag.

## Contract Details

**Source**: `/contracts/ClaimsContract.sol`

**Constructor Args**:
- `_usdt`: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (Polygon USDT)
- `_platformSigner`: Address derived from `SETTLEMENT_EVM_SIGNER_PRIVATE_KEY`

**EIP-712 Domain**:
- name: "SatelinkClaims"
- version: "1"
- chainId: 137
- verifyingContract: <new contract address>

**Key Features**:
- `claim(nodeId, amount, nonce, expiry, signature)` - EIP-712 based claims
- `emergencyWithdraw(to, amount)` - Admin can rescue stuck funds
- `platformSigner` - Set at deployment, updatable by admin

## About Stuck Funds

The 4.93 USDT in the old contract `0xE475c53B...` is **unrecoverable** because:
1. No address has CLAIM_CREATOR_ROLE to create claims
2. No emergencyWithdraw function exists
3. The only withdrawal path requires valid claims which can't be created

Deployer `0x3b324B334E1e8ec926310e6716C97A9aF43b667A` has DEFAULT_ADMIN_ROLE but there's no function to extract USDT directly.
