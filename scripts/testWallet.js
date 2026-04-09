import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // --- Validate env ---
  if (!process.env.POLYGON_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("Missing POLYGON_RPC or PRIVATE_KEY in .env");
  }

  // --- Connect ---
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // --- Network check ---
  const network = await provider.getNetwork();
  console.log("Network name :", network.name);
  console.log("Chain ID      :", Number(network.chainId));

  if (Number(network.chainId) !== 137) {
    throw new Error(`Wrong network! Expected Polygon (137), got ${network.chainId}`);
  }

  // --- Wallet info ---
  console.log("Wallet address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("MATIC balance :", ethers.formatEther(balance), "MATIC");

  // --- Nonce (confirms account indexing) ---
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log("Nonce         :", nonce);

  // --- Gas price ---
  const feeData = await provider.getFeeData();
  console.log("Gas price     :", ethers.formatUnits(feeData.gasPrice ?? 0n, "gwei"), "gwei");

  console.log("\n✅ Wallet connection verified on Polygon mainnet.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
