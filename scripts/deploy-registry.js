import hre from "hardhat";

async function main() {
  if (!hre.ethers) {
    console.log("hre.ethers is missing. Loaded keys:", Object.keys(hre));
    throw new Error("hardhat-ethers plugin not loaded");
  }

  const Factory = await hre.ethers.getContractFactory("NodeRegistryV2");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const addr = await registry.getAddress();
  console.log("NodeRegistryV2 deployed to:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
