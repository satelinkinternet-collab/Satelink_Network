# Deploying Satelink Contracts to Polygon Network

## Networks
- **Testnet:** Polygon Amoy (chainId: 80002)
- **Mainnet:** Polygon PoS (chainId: 137)

## Required GitHub Secrets
- `DEPLOYER_PK` — Deployer wallet private key (funded with MATIC for gas)
- `RPC_URL` — Polygon Amoy: `https://rpc-amoy.polygon.technology`
- `POLYGONSCAN_API_KEY` — For contract verification on Polygonscan
- `USDT_CONTRACT_ADDRESS` — USDT token on the target network

## Deploy Command
```bash
# Testnet (Amoy)
RPC_URL=https://rpc-amoy.polygon.technology node scripts/deploy-ethers.mjs

# Mainnet
RPC_URL=https://polygon-rpc.com node scripts/deploy-ethers.mjs
```

## Verify on Polygonscan
After deployment, verify with:
```bash
forge verify-contract <ADDRESS> NodeRegistryV2 \
  --chain polygon \
  --etherscan-api-key $POLYGONSCAN_API_KEY
```

## Environment Variables Required
See `.env.example` for full list. Key vars:
- `RPC_URL` — Polygon RPC endpoint
- `CHAIN_ID` — 80002 (Amoy) or 137 (Mainnet)
- `TREASURY_ADDRESS` — deployed vault address
- `USDT_CONTRACT_ADDRESS` — USDT ERC-20 on Polygon
