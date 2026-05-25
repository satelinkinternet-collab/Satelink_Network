#!/usr/bin/env node
// scripts/test-credit-flow.mjs
// Tests the full credit pipeline WITHOUT real on-chain events
// Uses DepositListener.creditManual() to simulate deposits
// Run: node scripts/test-credit-flow.mjs

import 'dotenv/config';
import pg from 'pg';
import { DepositListener } from '../apps/api/src/services/deposit_listener.js';

const { Pool } = pg;

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
let passed = 0;
let failed = 0;

function assert(condition, label, actual) {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label} | got: ${actual}`);
    failed++;
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Satelink Credit Pipeline — Local Test   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const TEST_WALLET = '0xdead000000000000000000000000000000000001';
  const CLEAN_WALLET = TEST_WALLET.toLowerCase();

  // ── Cleanup from previous runs
  await db.query('DELETE FROM credit_deposits WHERE wallet_address = $1', [CLEAN_WALLET]);
  await db.query('DELETE FROM credit_balances WHERE wallet_address = $1', [CLEAN_WALLET]);
  console.log('[Setup] Cleaned previous test data\n');

  // Create listener (no real provider — manual mode only)
  const listener = new DepositListener(db, console);

  // ──────────────────────────────────────────
  console.log('[TEST 1] Credit deposit creates balance row');
  await listener.creditManual({
    walletAddress: TEST_WALLET,
    amountUsdt: 5.00,
    txHash: '0xtest_tx_001'
  });

  const bal1 = await db.query(
    'SELECT balance_usdt, total_deposited FROM credit_balances WHERE wallet_address = $1',
    [CLEAN_WALLET]
  );
  assert(bal1.rows.length === 1, 'Row created in credit_balances', bal1.rows.length);
  assert(parseFloat(bal1.rows[0].balance_usdt) === 5.00, 'balance_usdt = 5.00', bal1.rows[0].balance_usdt);
  assert(parseFloat(bal1.rows[0].total_deposited) === 5.00, 'total_deposited = 5.00', bal1.rows[0].total_deposited);

  // ──────────────────────────────────────────
  console.log('\n[TEST 2] Second deposit adds to balance');
  await listener.creditManual({
    walletAddress: TEST_WALLET,
    amountUsdt: 3.00,
    txHash: '0xtest_tx_002'
  });

  const bal2 = await db.query(
    'SELECT balance_usdt, total_deposited FROM credit_balances WHERE wallet_address = $1',
    [CLEAN_WALLET]
  );
  assert(parseFloat(bal2.rows[0].balance_usdt) === 8.00, 'balance accumulates to 8.00', bal2.rows[0].balance_usdt);
  assert(parseFloat(bal2.rows[0].total_deposited) === 8.00, 'total_deposited = 8.00', bal2.rows[0].total_deposited);

  // ──────────────────────────────────────────
  console.log('\n[TEST 3] Duplicate tx_hash is rejected (idempotency)');
  await listener.creditManual({
    walletAddress: TEST_WALLET,
    amountUsdt: 999.00,
    txHash: '0xtest_tx_001'  // same tx as TEST 1 — must not double-credit
  });

  const bal3 = await db.query(
    'SELECT balance_usdt FROM credit_balances WHERE wallet_address = $1',
    [CLEAN_WALLET]
  );
  assert(parseFloat(bal3.rows[0].balance_usdt) === 8.00, 'Duplicate rejected — balance still 8.00', bal3.rows[0].balance_usdt);

  // ──────────────────────────────────────────
  console.log('\n[TEST 4] Credit gate deducts on funded wallet');
  const cost = 0.00003;
  const deductResult = await db.query(
    `UPDATE credit_balances
     SET balance_usdt = balance_usdt - $1,
         total_spent  = total_spent + $1,
         updated_at   = NOW()
     WHERE lower(wallet_address) = $2
       AND balance_usdt >= $1
     RETURNING balance_usdt`,
    [cost, CLEAN_WALLET]
  );
  assert(deductResult.rowCount === 1, 'Deduction succeeded', deductResult.rowCount);
  const remaining = parseFloat(deductResult.rows[0].balance_usdt);
  assert(Math.abs(remaining - (8.00 - cost)) < 0.000001, `Balance after deduction = ${(8.00 - cost).toFixed(5)}`, remaining);

  // ──────────────────────────────────────────
  console.log('\n[TEST 5] Credit gate BLOCKS on zero balance');
  // Drain balance to 0
  await db.query(
    'UPDATE credit_balances SET balance_usdt = 0 WHERE wallet_address = $1',
    [CLEAN_WALLET]
  );
  const blockResult = await db.query(
    `UPDATE credit_balances
     SET balance_usdt = balance_usdt - $1,
         total_spent  = total_spent + $1
     WHERE lower(wallet_address) = $2
       AND balance_usdt >= $1
     RETURNING balance_usdt`,
    [cost, CLEAN_WALLET]
  );
  assert(blockResult.rowCount === 0, 'Deduction blocked on zero balance (rowCount = 0)', blockResult.rowCount);

  // ──────────────────────────────────────────
  console.log('\n[TEST 6] Deposit history recorded correctly');
  const deposits = await db.query(
    'SELECT count(*) as cnt FROM credit_deposits WHERE wallet_address = $1',
    [CLEAN_WALLET]
  );
  // Should be 2 unique txes (tx_001 credited once despite 2 attempts, tx_002 once)
  assert(parseInt(deposits.rows[0].cnt) === 2, 'credit_deposits has 2 rows (duplicates excluded)', deposits.rows[0].cnt);

  // ──────────────────────────────────────────
  console.log('\n[TEST 7] rpc_method_pricing table seeded');
  const pricing = await db.query(
    'SELECT price_usdt FROM rpc_method_pricing WHERE method_name = $1',
    ['eth_call']
  );
  assert(pricing.rows.length === 1, 'eth_call pricing exists', pricing.rows.length);
  assert(parseFloat(pricing.rows[0].price_usdt) === 0.00003, 'eth_call price = 0.00003 USDT', pricing.rows[0].price_usdt);

  // ──────────────────────────────────────────
  // Cleanup
  await db.query('DELETE FROM credit_deposits WHERE wallet_address = $1', [CLEAN_WALLET]);
  await db.query('DELETE FROM credit_balances WHERE wallet_address = $1', [CLEAN_WALLET]);
  await db.end();

  // ──────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed  ${failed} failed           ║`);
  console.log('╚══════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n[BLOCKED] Fix failures before wiring to server.');
    process.exit(1);
  } else {
    console.log('\n[READY] All tests pass. Proceed to PROMPT 5 (wire to server).');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[TEST CRASHED]', err.message);
  process.exit(1);
});
