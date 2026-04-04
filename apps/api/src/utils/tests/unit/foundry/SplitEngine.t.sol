// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/SplitEngine.sol";

contract SplitEngineTest is Test {
    SplitEngine engine;
    address admin = address(this);
    address nonAdmin = address(0x1);

    function setUp() public {
        engine = new SplitEngine();
    }

    function testDefaultSplit() public {
        (uint256 nodePool, uint256 opsPool, uint256 treasury) = engine.calculateSplit(10000);
        assertEq(nodePool, 5000, "nodePool should be 50%");
        assertEq(opsPool, 3000, "opsPool should be 30%");
        assertEq(treasury, 2000, "treasury should be 20%");
    }

    function testCalculateFullSplit() public {
        (
            uint256 nodePool,
            uint256 opsPool,
            uint256 treasury,
            uint256 infraReserve,
            uint256 netNodeAmount
        ) = engine.calculateFullSplit(10000);

        assertEq(nodePool, 5000);
        assertEq(opsPool, 3000);
        assertEq(treasury, 2000);
        assertEq(infraReserve, 500); // 10% of 5000
        assertEq(netNodeAmount, 4500);
    }

    function testUpdateShares() public {
        engine.updateShares(6000, 2000, 2000, 500);
        (uint256 nodePool, uint256 opsPool, uint256 treasury) = engine.calculateSplit(10000);
        assertEq(nodePool, 6000);
        assertEq(opsPool, 2000);
        assertEq(treasury, 2000);
    }

    function testUpdateSharesMustSumTo10000() public {
        vm.expectRevert("SplitEngine: total shares must equal 10000");
        engine.updateShares(5000, 3000, 3000, 1000);
    }

    function testOnlyConfiguratorCanUpdateShares() public {
        vm.prank(nonAdmin);
        vm.expectRevert();
        engine.updateShares(5000, 3000, 2000, 1000);
    }

    function testFuzzCalculateSplit(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 1e30);
        (uint256 nodePool, uint256 opsPool, uint256 treasury) = engine.calculateSplit(amount);
        assertLe(nodePool + opsPool + treasury, amount);
    }
}
