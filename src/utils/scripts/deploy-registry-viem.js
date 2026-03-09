import hre from "hardhat";

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();

  console.log("Deployer:", deployer.account.address);

  const artifact = await hre.artifacts.readArtifact("NodeRegistryV2");

  const hash = await deployer.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("NodeRegistryV2 deployed to:", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
