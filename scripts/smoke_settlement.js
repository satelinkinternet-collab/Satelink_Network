import { ethers } from "ethers";
import "dotenv/config";
import { main as deploy, readArtifact } from "./deploy_settlement.js";

async function main() {
  console.log("Starting smoke test for settlement...\n");

  // 1. Deploy
  const { usdtAddress, vaultAddress, claimsAddress } = await deploy();

  console.log("\n--- Smoke Test Execution ---");

  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Default Hardhat account 0 and 1
  const defaultPkOwner = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const defaultPkClaimer = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const isLocal = rpcUrl.includes("127.0") || rpcUrl.includes("localhost");
  const pkOwner = isLocal ? defaultPkOwner : (process.env.PRIVATE_KEY || defaultPkOwner);
  const pkClaimer = isLocal ? defaultPkClaimer : (process.env.CLAIMER_PRIVATE_KEY || defaultPkClaimer);

  const owner = new ethers.Wallet(pkOwner, provider);
  const claimer = new ethers.Wallet(pkClaimer, provider);

  const artifactMock = await readArtifact("MockUSDT");
  const usdt = new ethers.Contract(usdtAddress, artifactMock.abi, owner);

  const artifactVault = await readArtifact("RevenueVault");
  const vault = new ethers.Contract(vaultAddress, artifactVault.abi, owner);

  const artifactClaims = await readArtifact("ClaimsContract");
  const claims = new ethers.Contract(claimsAddress, artifactClaims.abi, owner);

  // Setup vault balance
  const claimAmount = ethers.parseEther("0.1");
  console.log("Approving USDT for Vault...");
  const approveTx = await usdt.approve(vaultAddress, claimAmount);
  await approveTx.wait();

  console.log("Depositing USDT into Vault...");
  const depositTx = await vault.deposit(claimAmount);
  await depositTx.wait();

  // 2. Post sample root (createClaim)
  console.log(`Creating claim for address: ${claimer.address} for amount: ${ethers.formatEther(claimAmount)} USDT`);
  const tx1 = await claims.createClaim(claimer.address, claimAmount);
  const receipt1 = await tx1.wait();

  let claimId;
  for (const log of receipt1.logs) {
    try {
      const parsed = claims.interface.parseLog(log);
      if (parsed && parsed.name === "ClaimCreated") {
        claimId = parsed.args.claimId;
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!claimId) {
    throw new Error("Failed to find ClaimCreated event");
  }
  console.log("Claim created with ID:", claimId);

  // 3. Claim
  console.log("Claiming reward from address:", claimer.address);
  const claimsClaimerOpts = new ethers.Contract(claimsAddress, artifactClaims.abi, claimer);
  const tx2 = await claimsClaimerOpts.claimReward(claimId);
  await tx2.wait();

  const balanceClaimer = await claims.userBalances(claimer.address);
  console.log(`Claimer internal ledger balance: ${ethers.formatEther(balanceClaimer)} USDT`);

  if (balanceClaimer !== claimAmount) {
    throw new Error("Failed validation: Ledger balance does not match claim amount");
  }

  console.log("\n✅ Claim successful! Smoke test passed.");
}

if (process.argv[1] && process.argv[1].includes("smoke_settlement.js")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
