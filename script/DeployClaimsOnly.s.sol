// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/ClaimsContract.sol";

/// @title Deploy ClaimsContract Only (EIP-712 Version)
/// @notice Deploys the pull model ClaimsContract with EIP-712 signature verification
/// @dev Run: forge script script/DeployClaimsOnly.s.sol --rpc-url polygon --broadcast --verify
contract DeployClaimsOnly is Script {
    // Polygon Mainnet USDT
    address constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address platformSigner = vm.envAddress("PLATFORM_SIGNER_ADDRESS");

        address deployer = vm.addr(deployerKey);

        console.log("=== DEPLOYING CLAIMSCONTRACT (EIP-712) ===");
        console.log("Deployer:", deployer);
        console.log("Platform Signer:", platformSigner);
        console.log("USDT:", USDT);
        console.log("Chain ID:", block.chainid);

        require(block.chainid == 137, "Must deploy to Polygon mainnet (chainId 137)");
        require(platformSigner != address(0), "PLATFORM_SIGNER_ADDRESS required");

        vm.startBroadcast(deployerKey);

        ClaimsContract claims = new ClaimsContract(USDT, platformSigner);

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("ClaimsContract:", address(claims));
        console.log("\nNext steps:");
        console.log("1. Update CLAIMS_CONTRACT_ADDRESS on Railway:", address(claims));
        console.log("2. Transfer USDT to contract for payouts");
        console.log("3. Verify on Polygonscan");

        vm.stopBroadcast();
    }
}
