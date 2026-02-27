require("@nomicfoundation/hardhat-ethers");
require("dotenv/config");

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
    solidity: {
        compilers: [
            { version: "0.8.20" },
            { version: "0.8.28" }
        ]
    }
};
