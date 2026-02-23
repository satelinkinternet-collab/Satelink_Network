import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function readArtifact(contractName) {
    const artifactPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const raw = await fs.readFile(artifactPath, "utf8");
    return JSON.parse(raw);
}

export async function main() {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    console.log("Connecting to network at:", rpcUrl);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Default Hardhat account 0
    const defaultPk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const pk = (rpcUrl.includes("127.0") || rpcUrl.includes("localhost"))
        ? defaultPk
        : (process.env.PRIVATE_KEY || defaultPk);
    const deployer = new ethers.Wallet(pk, provider);

    console.log("Deploying contracts with account:", deployer.address);

    let usdtAddress = process.env.USDT_ADDRESS;

    if (!usdtAddress) {
        console.log("No USDT_ADDRESS provided in env. Deploying MockUSDT...");
        const artifactMock = await readArtifact("MockUSDT");
        const factoryMock = new ethers.ContractFactory(artifactMock.abi, artifactMock.bytecode, deployer);
        const mockUsdt = await factoryMock.deploy();
        await mockUsdt.waitForDeployment();
        usdtAddress = await mockUsdt.getAddress();
        console.log("MockUSDT deployed to:", usdtAddress);
    } else {
        console.log("Using provided USDT address:", usdtAddress);
    }

    const artifactVault = await readArtifact("RevenueVault");
    const factoryVault = new ethers.ContractFactory(artifactVault.abi, artifactVault.bytecode, deployer);
    const vault = await factoryVault.deploy(usdtAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("RevenueVault deployed to:", vaultAddress);

    const artifactClaims = await readArtifact("ClaimsContract");
    const factoryClaims = new ethers.ContractFactory(artifactClaims.abi, artifactClaims.bytecode, deployer);
    const claims = await factoryClaims.deploy(vaultAddress);
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
