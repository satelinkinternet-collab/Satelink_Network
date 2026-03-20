import { ethers } from "ethers";
import fs from "fs";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

    const abi = [
        "constructor(uint256 initialSupply)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];
    // Compile output from MockUSDT (I will just use forge's JSON output!)
    const json = JSON.parse(fs.readFileSync("./out/MockUSDT.sol/MockUSDT.json", "utf8"));
    const bytecode = json.bytecode.object;

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const initialSupply = ethers.parseUnits("1000000", 6);
    const contract = await factory.deploy(initialSupply);
    await contract.waitForDeployment();
    
    console.log(await contract.getAddress());
}

main().catch(console.error);
