#!/usr/bin/env node
// scripts/deploy-polygon-amoy.mjs
// PRIMARY deploy script for Polygon Amoy testnet
// Deploys: MockUSDT + RevenueVault
// Run: node scripts/deploy-polygon-amoy.mjs
// Updated: Polygon Amoy (chainId: 80002)

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology';
const EXPECTED_CHAIN_ID = 80002;
const MIN_MATIC_REQUIRED = 0.05; // minimum for deployment

// Foundry outputs to out/ not artifacts/
function readArtifact(contractName) {
  const paths = [
    join(ROOT, `out/${contractName}.sol/${contractName}.json`),
    join(ROOT, `artifacts/contracts/${contractName}.sol/${contractName}.json`)
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {}
  }
  throw new Error(`Artifact not found for ${contractName}. Run: forge build`);
}

async function main() {
  console.log('=== Satelink — Deploy to Polygon Amoy ===\n');

  // ── Validate env
  const pk = process.env.PRIVATE_KEY || process.env.DEPLOYER_PK;
  if (!pk) throw new Error('PRIVATE_KEY not set in .env');

  // ── Connect
  const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC);
  const wallet = new ethers.Wallet(pk, provider);

  // ── Chain check
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Wrong chain. Expected ${EXPECTED_CHAIN_ID} (Polygon Amoy), got ${chainId}`);
  }
  console.log(`Chain: Polygon Amoy (${chainId})`);

  // ── Balance check
  const balance = await provider.getBalance(wallet.address);
  const maticBalance = parseFloat(ethers.formatEther(balance));
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${maticBalance.toFixed(6)} MATIC`);

  if (maticBalance < MIN_MATIC_REQUIRED) {
    console.error(`\n[BLOCKED] Insufficient MATIC: ${maticBalance} < ${MIN_MATIC_REQUIRED} required`);
    console.error('Get test MATIC at: https://faucet.polygon.technology');
    console.error(`Deployer address: ${wallet.address}`);
    process.exit(1);
  }

  let nonce = await provider.getTransactionCount(wallet.address);
  const deployed = {};

  // ── Deploy MockUSDT (testnet only)
  console.log('\n[1/2] Deploying MockUSDT...');
  const usdtArtifact = readArtifact('MockUSDT');
  const USDTFactory = new ethers.ContractFactory(
    usdtArtifact.abi,
    usdtArtifact.bytecode,
    wallet
  );
  const usdt = await USDTFactory.deploy({ nonce: nonce++ });
  await usdt.waitForDeployment();
  deployed.USDT_CONTRACT_ADDRESS = await usdt.getAddress();
  console.log(`MockUSDT: ${deployed.USDT_CONTRACT_ADDRESS}`);

  // ── Deploy RevenueVault
  console.log('\n[2/2] Deploying RevenueVault...');
  const vaultArtifact = readArtifact('RevenueVault');
  const VaultFactory = new ethers.ContractFactory(
    vaultArtifact.abi,
    vaultArtifact.bytecode,
    wallet
  );
  const vault = await VaultFactory.deploy(deployed.USDT_CONTRACT_ADDRESS, { nonce: nonce++ });
  await vault.waitForDeployment();
  deployed.REVENUE_VAULT_ADDRESS = await vault.getAddress();
  console.log(`RevenueVault: ${deployed.REVENUE_VAULT_ADDRESS}`);

  // ── Print results
  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log(`Network: Polygon Amoy (chainId: ${EXPECTED_CHAIN_ID})`);
  for (const [key, addr] of Object.entries(deployed)) {
    console.log(`${key}=${addr}`);
  }
  console.log(`\nVerify MockUSDT: https://amoy.polygonscan.com/address/${deployed.USDT_CONTRACT_ADDRESS}`);
  console.log(`Verify RevenueVault: https://amoy.polygonscan.com/address/${deployed.REVENUE_VAULT_ADDRESS}`);
  console.log('\n[ACTION REQUIRED] Add these to your .env:');
  for (const [key, addr] of Object.entries(deployed)) {
    console.log(`${key}=${addr}`);
  }
}

main().catch(err => {
  console.error('\n[DEPLOY FAILED]', err.message);
  process.exit(1);
});
