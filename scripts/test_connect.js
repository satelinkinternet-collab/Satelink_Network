import hre from "hardhat";
async function run() {
    const conn = await hre.network.connect();
    console.log("Keys:", Object.keys(conn));
}
run();
