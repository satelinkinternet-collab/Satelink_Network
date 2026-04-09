import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const ERC20_ABI = [
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

export async function sendUSDT(to, amountHuman, tokenAddress) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const network = await provider.getNetwork();
  console.log("Chain ID:", network.chainId);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  const decimals = await token.decimals();

  const amount = ethers.parseUnits(amountHuman.toString(), decimals);

  const tx = await token.transfer(to, amount);

  return tx.hash;
}
