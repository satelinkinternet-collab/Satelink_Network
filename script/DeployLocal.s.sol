// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/MockUSDT.sol";
import "../contracts/RevenueVault.sol";
import "../contracts/NodeRegistryV2.sol";
import "../contracts/ClaimsWithdrawals.sol";
import "../contracts/EpochAnchor.sol";

contract DeployLocal is Script {
    function run() external {
        // Default foundry local key (Account 0)
        uint256 deployerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address oracleAddress = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Account 0 for testing
        
        vm.startBroadcast(deployerKey);
        
        // 1. MockUSDT (testnet only)
        MockUSDT usdt = new MockUSDT();
        
        // 2. RevenueVault
        RevenueVault vault = new RevenueVault(address(usdt));
        
        // 3. NodeRegistryV2
        NodeRegistryV2 registry = new NodeRegistryV2(msg.sender);
        
        // 4. EpochAnchor -> Need oracle address
        EpochAnchor anchor = new EpochAnchor(msg.sender, oracleAddress);
        
        // 5. ClaimsWithdrawals
        ClaimsWithdrawals claims = new ClaimsWithdrawals(address(anchor), address(vault));
        
        // 6. Grant Role to ClaimsWithdrawals
        vault.grantRole(vault.WITHDRAWER_ROLE(), address(claims));
        
        vm.stopBroadcast();
        
        console.log("MockUSDT:", address(usdt));
        console.log("RevenueVault:", address(vault));
        console.log("NodeRegistryV2:", address(registry));
        console.log("EpochAnchor:", address(anchor));
        console.log("ClaimsWithdrawals:", address(claims));
    }
}
