// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/api/src/utils/lib/forge-std/src/Script.sol";
import "../src/MockUSDT.sol";

contract DeployMockUSDT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        new MockUSDT(1000000000000);

        vm.stopBroadcast();
    }
}
