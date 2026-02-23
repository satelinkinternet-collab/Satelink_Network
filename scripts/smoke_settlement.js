/**
 * scripts/smoke_settlement.js
 *
 * End-to-end smoke test for the settlement contract stack:
 *   deploy → fund vault → create claim → claim reward → withdraw → verify
 *
 * Usage:
 *   # Hardhat in-memory network (default, no PRIVATE_KEY needed):
 *   npx hardhat run scripts/smoke_settlement.js
 *
 *   # Fuse Sparknet testnet (requires PRIVATE_KEY in env):
 *   npx hardhat run scripts/smoke_settlement.js --network sparknet
 *
 *   # Fuse Mainnet (requires PRIVATE_KEY + funded wallet):
 *   npx hardhat run scripts/smoke_settlement.js --network fuse
 *
 * Environment variables:
 *   PRIVATE_KEY    — required for sparknet / fuse (not needed for local Hardhat)
 *   USDT_ADDRESS   — optional; skips MockUSDT deploy when set (for live networks)
 */

import hre from "hardhat";
import { main as deploySettlement } from "./deploy_settlement.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function hr(label) {
  const line = "─".repeat(55);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : line);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { ethers, network } = hre;

  console.log("\n" + "═".repeat(55));
  console.log("  SMOKE TEST — Settlement Contracts");
  console.log(`  Network: ${network.name}`);
  console.log("═".repeat(55));

  // ── Step 1: Deploy ──────────────────────────────────────────────────────────
  hr("Step 1 · Deploy settlement contracts");
  const { usdtAddress, vaultAddress, claimsAddress } = await deploySettlement();

  const signers  = await ethers.getSigners();
  const owner    = signers[0];
  // Use a second account as claimant if available (Hardhat provides 20).
  // Falls back to owner on single-key setups (Sparknet / Fuse with one PK).
  const claimant = signers[1] ?? owner;

  console.log(`  Deployer / owner : ${owner.address}`);
  console.log(`  Claimant         : ${claimant.address}`);

  const usdt   = await ethers.getContractAt("MockUSDT",       usdtAddress);
  const vault  = await ethers.getContractAt("RevenueVault",   vaultAddress);
  const claims = await ethers.getContractAt("ClaimsContract", claimsAddress);

  // ── Step 2: Wire vault → ClaimsContract ────────────────────────────────────
  // ClaimsContract.withdrawFunds() calls vault.withdraw(to, amount).
  // RevenueVault.withdraw() is onlyOwner, so ClaimsContract must own the vault.
  hr("Step 2 · Transfer vault ownership → ClaimsContract");
  await (await vault.connect(owner).transferOwnership(claimsAddress)).wait();
  const vaultOwner = await vault.owner();
  assert(vaultOwner === claimsAddress, `vault.owner() mismatch: got ${vaultOwner}`);
  console.log(`  ✓ vault.owner() = ${vaultOwner}`);

  // ── Step 3: Fund the vault ──────────────────────────────────────────────────
  // MockUSDT inherits OZ ERC20 → 18 decimals.
  // On live networks with a real USDT_ADDRESS, decimals() returns 6.
  hr("Step 3 · Deposit USDT into vault");
  const decimals      = await usdt.decimals();
  const depositAmount = ethers.parseUnits("1000", decimals);
  const claimAmount   = ethers.parseUnits("100",  decimals);

  await (await usdt.connect(owner).approve(vaultAddress, depositAmount)).wait();
  await (await vault.connect(owner).deposit(depositAmount)).wait();

  const vaultBalance = await usdt.balanceOf(vaultAddress);
  assert(vaultBalance >= claimAmount, `Vault balance too low: ${vaultBalance}`);
  console.log(`  ✓ Vault balance = ${ethers.formatUnits(vaultBalance, decimals)} USDT`);

  // ── Step 4: Create claim (post sample root) ─────────────────────────────────
  hr("Step 4 · Create claim (post sample root)");
  console.log(`  Creating claim: ${ethers.formatUnits(claimAmount, decimals)} USDT → ${claimant.address}`);
  const createTx      = await claims.connect(owner).createClaim(claimant.address, claimAmount);
  const createReceipt = await createTx.wait();

  // Parse claimId from ClaimCreated(bytes32 claimId, address user, uint256 amount, uint256 expiry)
  let claimId;
  for (const log of createReceipt.logs) {
    try {
      const parsed = claims.interface.parseLog(log);
      if (parsed?.name === "ClaimCreated") {
        claimId = parsed.args.claimId;
        break;
      }
    } catch {
      // unrelated log — skip
    }
  }
  if (!claimId) throw new Error("ClaimCreated event not found in receipt");
  console.log(`  ✓ claimId = ${claimId}`);

  // ── Step 5: Claim reward ─────────────────────────────────────────────────────
  hr("Step 5 · Claim reward (update internal ledger)");
  await (await claims.connect(claimant).claimReward(claimId)).wait();

  const internalBalance = await claims.userBalances(claimant.address);
  assert(
    internalBalance === claimAmount,
    `Internal balance mismatch: got ${internalBalance}, expected ${claimAmount}`,
  );
  console.log(`  ✓ userBalances[claimant] = ${ethers.formatUnits(internalBalance, decimals)} USDT`);

  // ── Step 6: Withdraw funds ───────────────────────────────────────────────────
  hr("Step 6 · Withdraw funds (vault → claimant wallet)");
  const balanceBefore = await usdt.balanceOf(claimant.address);
  await (await claims.connect(claimant).withdrawFunds(claimAmount)).wait();
  const balanceAfter  = await usdt.balanceOf(claimant.address);

  const received = balanceAfter - balanceBefore;
  assert(
    received === claimAmount,
    `Received ${ethers.formatUnits(received, decimals)}, expected ${ethers.formatUnits(claimAmount, decimals)}`,
  );
  console.log(`  ✓ Received ${ethers.formatUnits(received, decimals)} USDT`);

  // Confirm internal ledger is cleared
  const finalLedger = await claims.userBalances(claimant.address);
  assert(finalLedger === 0n, `Ledger not cleared: ${finalLedger}`);
  console.log(`  ✓ userBalances[claimant] = 0 (cleared)`);

  // ── Result ───────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(55));
  console.log("  SMOKE TEST PASSED ✓");
  console.log("═".repeat(55));
  console.log("\n  Deployed contract addresses:");
  console.log(`    MockUSDT       ${usdtAddress}`);
  console.log(`    RevenueVault   ${vaultAddress}`);
  console.log(`    ClaimsContract ${claimsAddress}\n`);
}

main().catch((err) => {
  console.error("\n" + "═".repeat(55));
  console.error("  SMOKE TEST FAILED ✗");
  console.error("═".repeat(55) + "\n");
  console.error(err);
  process.exitCode = 1;
});
