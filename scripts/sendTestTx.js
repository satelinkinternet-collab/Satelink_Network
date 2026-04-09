import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // --- Validate env ---
  if (!process.env.POLYGON_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("Missing POLYGON_RPC or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // --- Network guard ---
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 137) {
    throw new Error(`Wrong network! Expected Polygon (137), got ${network.chainId}`);
  }
  console.log("Network: Polygon mainnet (137)");
  console.log("Sender :", wallet.address);

  // --- Balance check ---
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    throw new Error("Zero MATIC balance — fund your wallet before sending");
  }

  // --- Build self-transfer ---
  const txRequest = {
    to: wallet.address,
    value: ethers.parseEther("0.0001"),
  };

  // --- Gas estimation ---
  const gasEstimate = await provider.estimateGas({ ...txRequest, from: wallet.address });
  const feeData = await provider.getFeeData();
  const estimatedCost = gasEstimate * (feeData.gasPrice ?? 0n);
  console.log("Estimated gas :", gasEstimate.toString());
  console.log("Estimated cost:", ethers.formatEther(estimatedCost), "MATIC");

  if (balance < estimatedCost + txRequest.value) {
    throw new Error(
      `Insufficient funds. Need ${ethers.formatEther(estimatedCost + txRequest.value)} MATIC, have ${ethers.formatEther(balance)}`
    );
  }

  // --- Send ---
  console.log("\nSending 0.0001 MATIC to self...");
  const tx = await wallet.sendTransaction(txRequest);
  console.log("TX hash:", tx.hash);
  console.log("Explorer: https://polygonscan.com/tx/" + tx.hash);

  // --- Wait for confirmation ---
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait(1); // 1 confirmation
  console.log("✅ Confirmed in block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
}

main().catch((err) => {
  console.error("❌ Error:", err.shortMessage || err.message);
  if (err.code) console.error("   Code:", err.code);
  process.exit(1);
});
