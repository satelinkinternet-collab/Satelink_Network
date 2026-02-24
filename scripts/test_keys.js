import hre from "hardhat";
console.log("NETWORK KEYS:", hre.network ? Object.keys(hre.network) : null);
if (hre.network) console.log("PROVIDER:", !!hre.network.provider);
