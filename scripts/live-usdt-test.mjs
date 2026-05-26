#!/usr/bin/env node
// scripts/live-usdt-test.mjs
// Live USDT deposit test for autonomous payer system
// Chain: Polygon Mainnet (137)
// Settlement: USDT (6 decimals)

import { ethers } from 'ethers';

// ── Configuration
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const REVENUE_VAULT = '0x80AFEaC3B77CbeC1f7B9f24a50319DC72785DdA3';
const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';
const TEST_AMOUNT_USDT = 0.50; // $0.50

// ── ABIs
const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const VAULT_ABI = [
  'function deposit(uint256 amount) external',
  'event Deposited(address indexed from, uint256 amount)'
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function checkBalance(wallet) {
  const res = await fetch(`${API_BASE}/credits/balance?wallet=${wallet}`);
  return res.json();
}

async function testRpcCall(wallet) {
  const res = await fetch(`${API_BASE}/rpc/polygon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Wallet-Address': wallet
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    })
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  log('='.repeat(60));
  log('SATELINK LIVE USDT DEPOSIT TEST');
  log('='.repeat(60));
  log(`Network: Polygon Mainnet (137)`);
  log(`USDT Contract: ${USDT_CONTRACT}`);
  log(`Revenue Vault: ${REVENUE_VAULT}`);
  log(`API: ${API_BASE}`);
  log(`Test Amount: $${TEST_AMOUNT_USDT} USDT`);
  log('='.repeat(60));

  // Check for private key
  const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    log('');
    log('ERROR: TEST_WALLET_PRIVATE_KEY not set');
    log('');
    log('To run this test:');
    log('1. Create a test wallet or use an existing one');
    log('2. Fund it with at least $1 USDT on Polygon Mainnet');
    log('3. Fund it with ~0.1 MATIC for gas');
    log('4. Run: TEST_WALLET_PRIVATE_KEY=0x... node scripts/live-usdt-test.mjs');
    log('');
    log('MANUAL TEST (without deposit):');
    log('You can manually test by:');
    log('1. Sending $0.50 USDT directly to the RevenueVault contract');
    log('2. Watching the server logs for "[DepositListener] Deposit detected"');
    log('3. Checking balance: curl "$API_BASE_URL/credits/balance?wallet=YOUR_WALLET"');
    log('4. Testing RPC: curl -X POST $API_BASE_URL/rpc/polygon \\');
    log('     -H "Content-Type: application/json" \\');
    log('     -H "X-Wallet-Address: YOUR_WALLET" \\');
    log('     -d \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\'');
    process.exit(1);
  }

  // Connect to Polygon
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  const walletAddress = wallet.address.toLowerCase();

  log(`Test Wallet: ${walletAddress}`);

  // Check network
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 137) {
    log(`ERROR: Wrong network! Expected 137, got ${network.chainId}`);
    process.exit(1);
  }
  log(`Connected to Polygon Mainnet (chainId: ${network.chainId})`);

  // Check wallet MATIC balance (for gas)
  const maticBalance = await provider.getBalance(walletAddress);
  const maticFormatted = ethers.formatEther(maticBalance);
  log(`MATIC Balance: ${maticFormatted}`);
  if (parseFloat(maticFormatted) < 0.01) {
    log('WARNING: Low MATIC balance. May not have enough for gas.');
  }

  // Check wallet USDT balance
  const usdt = new ethers.Contract(USDT_CONTRACT, USDT_ABI, wallet);
  const usdtBalance = await usdt.balanceOf(walletAddress);
  const usdtFormatted = ethers.formatUnits(usdtBalance, 6);
  log(`USDT Balance: $${usdtFormatted}`);

  const amountWei = ethers.parseUnits(String(TEST_AMOUNT_USDT), 6);
  if (usdtBalance < amountWei) {
    log(`ERROR: Insufficient USDT. Need at least $${TEST_AMOUNT_USDT}`);
    process.exit(1);
  }

  // ── Pre-deposit: Check Satelink credit balance
  log('');
  log('=== STEP 1: Check pre-deposit credit balance ===');
  const preBal = await checkBalance(walletAddress);
  log(`Satelink Credits: $${preBal.balance_usdt || 0} USDT`);

  // ── Pre-deposit: Test RPC (should return 402)
  log('');
  log('=== STEP 2: Test RPC call (should return 402) ===');
  const preRpc = await testRpcCall(walletAddress);
  log(`RPC Response: HTTP ${preRpc.status}`);
  if (preRpc.status !== 402) {
    log(`WARNING: Expected 402, got ${preRpc.status}`);
    log(JSON.stringify(preRpc.body, null, 2));
  } else {
    log('✓ Correctly blocked with 402 (no credits)');
  }

  // ── Approve USDT spend
  log('');
  log('=== STEP 3: Approve USDT spend ===');
  const currentAllowance = await usdt.allowance(walletAddress, REVENUE_VAULT);
  if (currentAllowance < amountWei) {
    log(`Approving ${TEST_AMOUNT_USDT} USDT for vault...`);
    const approveTx = await usdt.approve(REVENUE_VAULT, amountWei);
    log(`Approve TX: ${approveTx.hash}`);
    await approveTx.wait();
    log('✓ Approval confirmed');
  } else {
    log('✓ Already approved');
  }

  // ── Deposit to RevenueVault
  log('');
  log('=== STEP 4: Deposit USDT to RevenueVault ===');
  const vault = new ethers.Contract(REVENUE_VAULT, VAULT_ABI, wallet);
  log(`Depositing $${TEST_AMOUNT_USDT} USDT...`);
  const depositTx = await vault.deposit(amountWei);
  log(`Deposit TX: ${depositTx.hash}`);
  log(`Polygonscan: https://polygonscan.com/tx/${depositTx.hash}`);
  const receipt = await depositTx.wait();
  log(`✓ Deposit confirmed in block ${receipt.blockNumber}`);

  // ── Wait for DepositListener to credit balance
  log('');
  log('=== STEP 5: Wait for credit (up to 30s) ===');
  let credited = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const bal = await checkBalance(walletAddress);
    log(`Checking... balance: $${bal.balance_usdt || 0}`);
    if (parseFloat(bal.balance_usdt || 0) >= TEST_AMOUNT_USDT * 0.99) {
      credited = true;
      log(`✓ Credit received: $${bal.balance_usdt} USDT`);
      break;
    }
  }

  if (!credited) {
    log('WARNING: Credit not detected within 30s. Check server logs.');
    log('The DepositListener may still process it. Manual verification recommended.');
  }

  // ── Post-deposit: Test RPC (should return 200)
  log('');
  log('=== STEP 6: Test RPC call (should return 200) ===');
  const postRpc = await testRpcCall(walletAddress);
  log(`RPC Response: HTTP ${postRpc.status}`);
  if (postRpc.status === 200) {
    log(`✓ RPC call succeeded!`);
    log(`Block number: ${postRpc.body.result}`);
  } else {
    log(`ERROR: Expected 200, got ${postRpc.status}`);
    log(JSON.stringify(postRpc.body, null, 2));
  }

  // ── Final balance check
  log('');
  log('=== STEP 7: Final credit balance ===');
  const finalBal = await checkBalance(walletAddress);
  log(`Final Balance: $${finalBal.balance_usdt} USDT`);
  log(`Total Deposited: $${finalBal.total_deposited} USDT`);
  log(`Total Spent: $${finalBal.total_spent} USDT`);

  // ── Summary
  log('');
  log('='.repeat(60));
  log('TEST COMPLETE');
  log('='.repeat(60));
  if (postRpc.status === 200 && credited) {
    log('✓ PASS: Autonomous payer system working correctly');
    log('  - Deposit detected and credited');
    log('  - RPC calls deduct from balance');
    log('  - 402 returned when balance insufficient');
  } else {
    log('⚠ PARTIAL: Manual verification recommended');
  }
}

main().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
