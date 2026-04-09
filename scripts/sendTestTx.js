import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  if (!process.env.FUSE_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("Missing env variables");
  }

  const provider = new ethers.JsonRpcProvider(process.env.FUSE_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Sender:", wallet.address);

  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: ethers.parseEther("0.0001")
  });

  console.log("TX sent:", tx.hash);

  const receipt = await tx.wait();

  console.log("Confirmed in block:", receipt.blockNumber);
}

main().catch(console.error);
