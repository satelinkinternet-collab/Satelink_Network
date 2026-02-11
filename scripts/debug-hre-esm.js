import hre from "hardhat";

async function main() {
    console.log("HRE Keys:", Object.keys(hre));
    if (hre.ethers) {
        console.log("✅ hre.ethers is available");
        const [signer] = await hre.ethers.getSigners();
        console.log("Signer:", signer.address);
    } else {
        console.error("❌ hre.ethers is UNDEFINED. Check plugins.");
    }
}

main().catch(console.error);
