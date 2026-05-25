#!/usr/bin/env node
// scripts/deploy-polygon-mainnet.mjs
// Deploys RevenueVault to Polygon Mainnet (chain ID 137)
// Uses REAL USDT — no MockUSDT on mainnet
// Real USDT on Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
// Run: node scripts/deploy-polygon-mainnet.mjs

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Polygon Mainnet config
const POLYGON_MAINNET_RPC  = 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_MAINNET_ID   = 137;
const REAL_USDT_POLYGON    = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const MIN_MATIC_FOR_DEPLOY = 0.05;

function readArtifact(contractName) {
  // Foundry outputs to out/
  const foundryPath = join(ROOT, `out/${contractName}.sol/${contractName}.json`);
  // Hardhat fallback
  const hardhatPath = join(ROOT, `artifacts/contracts/${contractName}.sol/${contractName}.json`);

  for (const p of [foundryPath, hardhatPath]) {
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch {}
  }
  throw new Error(`Artifact not found for ${contractName}. Run: forge build`);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Satelink — Deploy to Polygon Mainnet    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── Env validation
  const pk = process.env.PRIVATE_KEY || process.env.DEPLOYER_PK;
  if (!pk) throw new Error('PRIVATE_KEY not set in .env');

  // ── Connect to Polygon Mainnet
  const provider = new ethers.JsonRpcProvider(POLYGON_MAINNET_RPC);
  const wallet = new ethers.Wallet(pk, provider);

  // ── Chain ID safety check (critical — prevents deploying to wrong chain)
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId !== POLYGON_MAINNET_ID) {
    throw new Error(
      `[SAFETY ABORT] Wrong chain detected.\n` +
      `Expected: ${POLYGON_MAINNET_ID} (Polygon Mainnet)\n` +
      `Got: ${chainId}\n` +
      `Check your RPC_URL in .env`
    );
  }
  console.log(`✓ Chain: Polygon Mainnet (${chainId})`);

  // ── Balance check
  const balance = await provider.getBalance(wallet.address);
  const maticBal = parseFloat(ethers.formatEther(balance));
  console.log(`✓ Deployer: ${wallet.address}`);
  console.log(`✓ Balance:  ${maticBal.toFixed(6)} MATIC`);

  if (maticBal < MIN_MATIC_FOR_DEPLOY) {
    throw new Error(
      `[INSUFFICIENT MATIC] Have ${maticBal}, need ${MIN_MATIC_FOR_DEPLOY}\n` +
      `Bridge MATIC at: https://wallet.polygon.technology/`
    );
  }

  // ── Verify real USDT exists on-chain
  console.log(`\n[Verifying real USDT at ${REAL_USDT_POLYGON}]`);
  const usdtCode = await provider.getCode(REAL_USDT_POLYGON);
  if (usdtCode === '0x') {
    throw new Error(`Real USDT contract not found at ${REAL_USDT_POLYGON}`);
  }
  console.log(`✓ USDT contract verified on-chain (${usdtCode.length} bytes)`);

  // ── Deploy RevenueVault only (no MockUSDT on mainnet)
  let nonce = await provider.getTransactionCount(wallet.address);

  console.log('\n[Deploying RevenueVault...]');
  const vaultArtifact = readArtifact('RevenueVault');
  const VaultFactory = new ethers.ContractFactory(
    vaultArtifact.abi,
    vaultArtifact.bytecode,
    wallet
  );

  const vault = await VaultFactory.deploy(REAL_USDT_POLYGON, {
    nonce: nonce++,
    gasLimit: 2_000_000
  });

  console.log(`  → Tx submitted: ${vault.deploymentTransaction().hash}`);
  console.log(`  → Waiting for confirmation...`);

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log(`  ✓ RevenueVault deployed: ${vaultAddress}`);

  // ── Verify deployment
  const deployedCode = await provider.getCode(vaultAddress);
  if (deployedCode === '0x') {
    throw new Error(`[VERIFY FAILED] No code at ${vaultAddress} after deployment`);
  }
  console.log(`  ✓ Contract code verified on-chain`);

  // ── Results
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           DEPLOYMENT COMPLETE            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\nChain:              Polygon Mainnet (137)`);
  console.log(`REVENUE_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`USDT_CONTRACT_ADDRESS=${REAL_USDT_POLYGON}`);
  console.log(`\nPolygonscan: https://polygonscan.com/address/${vaultAddress}`);
  console.log(`Tx:          https://polygonscan.com/tx/${vault.deploymentTransaction().hash}`);
  console.log('\n[ACTION REQUIRED] Add to .env:');
  console.log(`REVENUE_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`USDT_CONTRACT_ADDRESS=${REAL_USDT_POLYGON}`);
  console.log(`POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com`);
  console.log(`POLYGON_CHAIN_ID=137`);
}

main().catch(err => {
  console.error('\n[DEPLOY FAILED]', err.message);
  process.exit(1);
});
