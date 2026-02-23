import { ethers } from "hardhat";

export async function main() {
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    console.log("Deploying contracts with account:", deployer ? deployer.address : "Unknown (Using default provider)");

    let usdtAddress = process.env.USDT_ADDRESS;

    if (!usdtAddress) {
        console.log("No USDT_ADDRESS provided in env. Deploying MockUSDT...");
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        const usdt = await MockUSDT.deploy();
        await usdt.waitForDeployment();
        usdtAddress = await usdt.getAddress();
        console.log("MockUSDT deployed to:", usdtAddress);
    } else {
        console.log("Using provided USDT address:", usdtAddress);
    }

    // Deploy RevenueVault
    const Vault = await ethers.getContractFactory("RevenueVault");
    const vault = await Vault.deploy(usdtAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("RevenueVault deployed to:", vaultAddress);

    // Deploy ClaimsContract
    const Claims = await ethers.getContractFactory("ClaimsContract");
    const claims = await Claims.deploy(vaultAddress);
    await claims.waitForDeployment();
    const claimsAddress = await claims.getAddress();
    console.log("ClaimsContract deployed to:", claimsAddress);

    console.log("\nDeployment completed successfully.");
    console.log("-----------------------------------------");
    console.log("USDT Address:    ", usdtAddress);
    console.log("RevenueVault:    ", vaultAddress);
    console.log("ClaimsContract:  ", claimsAddress);

    return { usdtAddress, vaultAddress, claimsAddress };
}

if (process.argv[1] && process.argv[1].includes("deploy_settlement.js")) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
