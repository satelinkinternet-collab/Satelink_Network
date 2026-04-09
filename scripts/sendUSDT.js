import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ⚠️ We will replace this later with real Fuse USDT address
const USDT_ADDRESS = "0x0000000000000000000000000000000000000000";

const ERC20_ABI = [
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

async function main() {
  if (!process.env.FUSE_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("Missing env variables");
  }

  const provider = new ethers.JsonRpcProvider(process.env.FUSE_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Wallet:", wallet.address);

  const token = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);

  const decimals = await token.decimals();

  const amount = ethers.parseUnits("1", decimals); // 1 USDT

  console.log("Sending USDT...");

  const tx = await token.transfer(wallet.address, amount);

  console.log("TX hash:", tx.hash);

  const receipt = await tx.wait();

  console.log("Confirmed in block:", receipt.blockNumber);
}

main().catch(console.error);