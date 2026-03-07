// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/MockUSDT.sol";
import "../contracts/RevenueVault.sol";
import "../contracts/NodeRegistryV2.sol";
import "../contracts/ClaimsWithdrawals.sol";
import "../contracts/ClaimsContract.sol";
import "../contracts/EpochAnchor.sol";
import "../contracts/SplitEngine.sol";
import "../contracts/EligibilityPolicy.sol";
import "../contracts/RevenueDistributor.sol";

/// @title Satelink Full Deployment Script
/// @notice Deploys all 9 contracts to Fuse Spark testnet (or local)
/// @dev Run: forge script script/Deploy.s.sol --rpc-url fuse_spark --broadcast
///      Requires: DEPLOYER_PRIVATE_KEY in environment
contract DeployAll is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // ── 1. MockUSDT (testnet only) ──
        MockUSDT usdt = new MockUSDT();
        console.log("1. MockUSDT:", address(usdt));

        // ── 2. SplitEngine (governance-controlled revenue splits) ──
        SplitEngine splitEngine = new SplitEngine(deployer);
        console.log("2. SplitEngine:", address(splitEngine));

        // ── 3. EligibilityPolicy (role-based eligibility) ──
        EligibilityPolicy eligibility = new EligibilityPolicy(deployer);
        console.log("3. EligibilityPolicy:", address(eligibility));

        // ── 4. NodeRegistryV2 (node registration + staking) ──
        NodeRegistryV2 registry = new NodeRegistryV2(deployer);
        console.log("4. NodeRegistryV2:", address(registry));

        // ── 5. RevenueVault (USDT custody) ──
        RevenueVault vault = new RevenueVault(address(usdt));
        console.log("5. RevenueVault:", address(vault));

        // ── 6. EpochAnchor (epoch lifecycle) ──
        // deployer acts as both admin and oracle for testnet
        EpochAnchor anchor = new EpochAnchor(deployer, deployer);
        console.log("6. EpochAnchor:", address(anchor));

        // ── 7. ClaimsContract (claim creation + expiry) ──
        ClaimsContract claimsContract = new ClaimsContract(address(vault));
        console.log("7. ClaimsContract:", address(claimsContract));

        // ── 8. ClaimsWithdrawals (epoch-gated withdrawals) ──
        ClaimsWithdrawals claimsWithdrawals = new ClaimsWithdrawals(
            address(anchor),
            address(vault)
        );
        console.log("8. ClaimsWithdrawals:", address(claimsWithdrawals));

        // ── 9. RevenueDistributor (50/30/20 splits) ──
        // For testnet, deployer address acts as all pool wallets
        RevenueDistributor distributor = new RevenueDistributor(
            address(usdt),
            deployer,  // nodeOperatorPool
            deployer,  // coreTreasury
            deployer,  // builderRewardsPool
            deployer,  // distributionPool
            deployer,  // infraReserve
            deployer   // admin
        );
        console.log("9. RevenueDistributor:", address(distributor));

        // ── Role Grants ──
        // Allow ClaimsWithdrawals to withdraw from vault
        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claimsWithdrawals));
        // Allow ClaimsContract to withdraw from vault
        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claimsContract));
        // Allow deployer to register nodes (for testnet seeding)
        registry.grantRole(registry.REGISTRAR_ROLE(), deployer);

        vm.stopBroadcast();

        // ── Summary ──
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("MockUSDT:", address(usdt));
        console.log("SplitEngine:", address(splitEngine));
        console.log("EligibilityPolicy:", address(eligibility));
        console.log("NodeRegistryV2:", address(registry));
        console.log("RevenueVault:", address(vault));
        console.log("EpochAnchor:", address(anchor));
        console.log("ClaimsContract:", address(claimsContract));
        console.log("ClaimsWithdrawals:", address(claimsWithdrawals));
        console.log("RevenueDistributor:", address(distributor));
        console.log("");
        console.log("Copy these addresses to .env for backend integration.");
    }
}
