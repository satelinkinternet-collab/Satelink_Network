import "dotenv/config";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

const NodeRegistryABI = [
  "function nodeCount() view returns (uint256)",
  "function getNode(uint256) view returns (address wallet, bool active)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const registryAddr = process.env.NODE_REGISTRY;
  if (!registryAddr) throw new Error("Missing NODE_REGISTRY in .env");

  const registry = new ethers.Contract(registryAddr, NodeRegistryABI, provider);

  const count = Number(await registry.nodeCount());
  console.log("nodeCount =", count);

  for (let i = 0; i < count; i++) {
    const [w, active] = await registry.getNode(i);
    const bal = await provider.getBalance(w);
    console.log(`nodeId ${i} wallet ${w} active=${active} balance=${ethers.formatEther(bal)} ETH`);
  }
}

main().catch(console.error);

