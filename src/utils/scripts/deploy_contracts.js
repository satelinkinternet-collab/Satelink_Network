const hre = require("hardhat");

async function main() {
    console.log("Deploying contracts...");

    // Mock USDT for local testing
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    console.log("MockUSDT deployed to:", await usdt.getAddress());

    // Revenue Vault
    const RevenueVault = await hre.ethers.getContractFactory("RevenueVault");
    const vault = await RevenueVault.deploy(await usdt.getAddress());
    await vault.waitForDeployment();
    console.log("RevenueVault deployed to:", await vault.getAddress());

    // NodeRegistryV2
    const NodeRegistry = await hre.ethers.getContractFactory("NodeRegistryV2");
    const registry = await NodeRegistry.deploy();
    await registry.waitForDeployment();
    console.log("NodeRegistryV2 deployed to:", await registry.getAddress());

    // RevenueDistributor
    const Distributor = await hre.ethers.getContractFactory("RevenueDistributor");
    const distributor = await Distributor.deploy(await usdt.getAddress());
    await distributor.waitForDeployment();
    console.log("RevenueDistributor deployed to:", await distributor.getAddress());

    // ClaimsContract
    const Claims = await hre.ethers.getContractFactory("ClaimsContract");
    const claims = await Claims.deploy(await vault.getAddress());
    await claims.waitForDeployment();
    console.log("ClaimsContract deployed to:", await claims.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
