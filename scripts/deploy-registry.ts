import hre from "hardhat";

async function main() {
  const ethers = (hre as any).ethers; // ✅ kills VS Code red underline

  const Factory = await ethers.getContractFactory("NodeRegistryV2");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const addr = await registry.getAddress();
  console.log("NodeRegistryV2 deployed to:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
