import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  if (!process.env.FUSE_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("Missing FUSE_RPC or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(process.env.FUSE_RPC);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Wallet address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);

  console.log("FUSE balance:", ethers.formatEther(balance));
}

main().catch((err) => {
  console.error("Error:", err.message);
});
