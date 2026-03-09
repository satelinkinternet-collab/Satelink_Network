import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
    console.log("🚀 Deploying Satelink DePIN ecosystem using manual Ethers provider...");

    // Connect to network directly (Hardhat 3 pattern for ESM)
    let connection;
    try {
        connection = await hre.network.connect();
    } catch (e) {
        // Fallback for Hardhat 2 or different config
        connection = hre.network;
    }

    // Create ethers provider wrapper
    const provider = new ethers.BrowserProvider(connection.provider);

    // Get signer (deployer)
    const signers = await provider.listAccounts();
    const deployer = await provider.getSigner(signers[0].address);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH");

    // Helper to deploy contract
    async function deployContract(name, args = []) {
        console.log(`\n📋 Deploying ${name}...`);
        const artifact = await hre.artifacts.readArtifact(name);
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
        const contract = await factory.deploy(...args);
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        console.log(`✅ ${name}:`, address);
        return { contract, address };
    }

    // 1. Mock USDT
    const mockUSDT = await deployContract("MockUSDT");

    // 2. NodeRegistryV2
    const registry = await deployContract("NodeRegistryV2");

    // 3. SplitEngine (50/30/20)
    const split = await deployContract("SplitEngine");

    // 4. RevenueVault (Treasury)
    const vault = await deployContract("RevenueVault", [mockUSDT.address]);

    // 5. ClaimsContract (Needs vault rights)
    const claims = await deployContract("ClaimsContract", [vault.address]);

    // 6. Connect Ecosystem: Transfer Vault ownership to ClaimsContract
    console.log("\nWiring up: Transferring RevenueVault ownership to ClaimsContract...");
    // We need to use the contract instance connected to signer
    // The deployed contract factory instance is valid for sending too in ethers v6?
    // Yes, 'contract' returned by factory.deploy() is connected to signer.
    // However, ABI is needed. The artifact has ABI.
    // The factory instance should have methods.
    // Let's create a Contract instance explicitly to be safe, using ABI.
    // Actually, factory.deploy returns a Contract instance.
    const vaultContract = new ethers.Contract(vault.address, (await hre.artifacts.readArtifact("RevenueVault")).abi, deployer);
    const tx = await vaultContract.transferOwnership(claims.address);
    await tx.wait();
    console.log("Done! ClaimsContract now owns RevenueVault.");

    // Output for .env
    console.log("\n==================================");
    console.log("DEPLOYMENT COMPLETE");
    console.log("==================================");
    console.log("Add these to your .env file:");
    console.log(`RPC_URL=<YOUR_RPC_URL>`);
    console.log(`USDT_ADDRESS=${mockUSDT.address}`);
    console.log(`NODE_REGISTRY_ADDRESS=${registry.address}`);
    console.log(`REVENUE_VAULT_ADDRESS=${vault.address}`);
    console.log(`SPLIT_ENGINE_ADDRESS=${split.address}`);
    console.log(`CLAIMS_CONTRACT_ADDRESS=${claims.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
