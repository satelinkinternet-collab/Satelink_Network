import "dotenv/config";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NODE_REGISTRY = process.env.NODE_REGISTRY;
const REVENUE_DISTRIBUTOR = process.env.REVENUE_DISTRIBUTOR;

const NodeRegistryABI = [
  "function nodeCount() view returns (uint256)",
  "function getNode(uint256) view returns (address wallet, bool active)"
];

const RevenueDistributorABI = [
  "function distribute(uint256 nodeId) payable"
];

function must(v, name) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  must(RPC_URL, "RPC_URL");
  must(PRIVATE_KEY, "PRIVATE_KEY");
  must(NODE_REGISTRY, "NODE_REGISTRY");
  must(REVENUE_DISTRIBUTOR, "REVENUE_DISTRIBUTOR");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const registry = new ethers.Contract(NODE_REGISTRY, NodeRegistryABI, provider);
  const distributor = new ethers.Contract(REVENUE_DISTRIBUTOR, RevenueDistributorABI, wallet);

  const count = Number(await registry.nodeCount());
  console.log("nodeCount:", count);

  const perNodeValue = ethers.parseEther("0.01"); // change later

  for (let i = 0; i < count; i++) {
    const [nodeWallet, active] = await registry.getNode(i);
    if (!active) continue;

    console.log(`Paying nodeId=${i} -> ${nodeWallet}`);
    const tx = await distributor.distribute(i, { value: perNodeValue });
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("confirmed ✅");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

