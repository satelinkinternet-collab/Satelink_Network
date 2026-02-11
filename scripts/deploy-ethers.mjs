import "dotenv/config";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

async function main() {
  const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
  const DEPLOYER_PK = process.env.DEPLOYER_PK;

  if (!DEPLOYER_PK) {
    throw new Error("DEPLOYER_PK missing in .env");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);

  console.log("RPC:", RPC_URL);
  console.log("Deployer:", wallet.address);

  const net = await provider.getNetwork();
  console.log("chainId:", net.chainId.toString());

  const bal = await provider.getBalance(wallet.address);
  console.log("balance_POL:", ethers.formatEther(bal));

  const artifactPath = path.resolve(
    "artifacts/contracts/NodeRegistryV2.sol/NodeRegistryV2.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  // Get fee data (EIP-1559) and add small bump to avoid underpricing
  const fee = await provider.getFeeData();
  const overrides = {};

  // Some RPCs return nulls; handle safely
  if (fee.maxFeePerGas != null && fee.maxPriorityFeePerGas != null) {
    overrides.maxFeePerGas = fee.maxFeePerGas + ethers.parseUnits("2", "gwei");
    overrides.maxPriorityFeePerGas =
      fee.maxPriorityFeePerGas + ethers.parseUnits("1", "gwei");
  } else if (fee.gasPrice != null) {
    overrides.gasPrice = fee.gasPrice + ethers.parseUnits("2", "gwei");
  }

  console.log("deploying...");

  // Deploy and immediately print tx hash
  const contract = await factory.deploy(overrides);
  console.log("deploy tx:", contract.deploymentTransaction().hash);

  console.log("waiting for 1 confirmation...");
  const receipt = await contract.deploymentTransaction().wait(1);
  console.log("mined in block:", receipt.blockNumber);

  const addr = await contract.getAddress();
  console.log("NodeRegistryV2 deployed to:", addr);

  // Helpful explorer link (Amoy)
  console.log("Explorer:", `https://amoy.polygonscan.com/address/${addr}`);
}

main().catch((e) => {
  console.error("DEPLOY ERROR:", e?.message || e);
  process.exit(1);
});

