// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/MockUSDT.sol";
import "../../contracts/RevenueDistributor.sol";

contract RevenueDistributorTest is Test {
    MockUSDT usdt;
    RevenueDistributor distributor;

    address admin = address(this);
    address nodeOpPool = address(0x10);
    address coreTreasury = address(0x11);
    address builderPool = address(0x12);
    address distPool = address(0x13);
    address infraPool = address(0x14);

    function setUp() public {
        usdt = new MockUSDT();
        distributor = new RevenueDistributor(
            address(usdt),
            nodeOpPool,
            coreTreasury,
            builderPool,
            distPool,
            infraPool,
            admin
        );

        // Fund admin with USDT and approve distributor
        usdt.approve(address(distributor), type(uint256).max);
    }

    function testDistribute() public {
        uint256 amount = 10000e18;
        distributor.distribute(amount, 1, false);

        // 50% to node op pool
        assertEq(usdt.balanceOf(nodeOpPool), 5000e18);
        // 30% platform = 70% core treasury + 30% builder
        // Platform = 3000e18; coreTreasury = 70% of 3000 = 2100; builder = 900
        assertEq(usdt.balanceOf(coreTreasury), 2100e18);
        assertEq(usdt.balanceOf(builderPool), 900e18);
        // 20% distribution pool
        assertEq(usdt.balanceOf(distPool), 2000e18);

        assertEq(distributor.totalDistributed(), amount);
        assertEq(distributor.epochCount(), 1);
    }

    function testDistributeWithInfraReserve() public {
        uint256 amount = 10000e18;
        distributor.distribute(amount, 1, true);

        // 10% infra reserve first = 1000e18
        assertEq(usdt.balanceOf(infraPool), 1000e18);

        // Remaining 9000e18 split 50/30/20
        assertEq(usdt.balanceOf(nodeOpPool), 4500e18);
        // Platform = 2700; coreTreasury = 70% of 2700 = 1890; builder = 810
        assertEq(usdt.balanceOf(coreTreasury), 1890e18);
        assertEq(usdt.balanceOf(builderPool), 810e18);
        assertEq(usdt.balanceOf(distPool), 1800e18);
    }

    function testDistributeZeroReverts() public {
        vm.expectRevert(RevenueDistributor.ZeroAmount.selector);
        distributor.distribute(0, 1, false);
    }

    function testOnlyDistributorRole() public {
        vm.prank(address(0x99));
        vm.expectRevert();
        distributor.distribute(1000e18, 1, false);
    }

    function testUpdateSplitConfig() public {
        distributor.updateSplitConfig(6000, 2000, 2000);
        (uint256 nodeOp,,,,) = distributor.splitConfig();
        assertEq(nodeOp, 6000);
    }

    function testUpdateSplitConfigMismatch() public {
        vm.expectRevert(abi.encodeWithSelector(RevenueDistributor.SplitMismatch.selector, 11000));
        distributor.updateSplitConfig(5000, 3000, 3000);
    }

    function testPause() public {
        distributor.pause();
        vm.expectRevert();
        distributor.distribute(1000e18, 1, false);
    }

    function testRejectETH() public {
        vm.expectRevert("RevenueDistributor: ETH not accepted. Use USDT.");
        (bool ok,) = address(distributor).call{value: 1 ether}("");
        // Silence unused variable warning
        ok;
    }
}
