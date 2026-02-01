import "dotenv/config";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

async function main() {
  const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

  // Hardhat default FIRST account private key (works on local hardhat node)
  // If your hardhat node shows a different first private key, replace it here.
  const DEPLOYER_PK =
    process.env.DEPLOYER_PK ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);

  console.log("RPC:", RPC_URL);
  console.log("Deployer:", await wallet.getAddress());

  const artifactPath = path.resolve(
    "artifacts/contracts/NodeRegistryV2.sol/NodeRegistryV2.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("NodeRegistryV2 deployed to:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
