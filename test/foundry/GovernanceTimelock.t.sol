// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/GovernanceTimelock.sol";

contract GovernanceTimelockTest is Test {
    GovernanceTimelock timelock;
    address proposer = address(0x1);
    address executor = address(0x2);
    address admin = address(this);

    function setUp() public {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = executor;

        timelock = new GovernanceTimelock(proposers, executors, admin);
    }

    function testMinDelay() public {
        assertEq(timelock.getMinDelay(), 24 hours);
        assertEq(timelock.MIN_DELAY(), 24 hours);
    }

    function testProposerHasRole() public {
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), proposer));
    }

    function testExecutorHasRole() public {
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), executor));
    }

    function testScheduleAndExecute() public {
        // Schedule a no-op call to the timelock itself
        bytes32 salt = keccak256("test-op");
        bytes memory data = abi.encodeWithSelector(timelock.updateDelay.selector, 48 hours);

        vm.prank(proposer);
        timelock.schedule(
            address(timelock),
            0,
            data,
            bytes32(0),
            salt,
            24 hours
        );

        bytes32 opId = timelock.hashOperation(address(timelock), 0, data, bytes32(0), salt);
        assertTrue(timelock.isOperationPending(opId));

        // Cannot execute before delay
        vm.prank(executor);
        vm.expectRevert();
        timelock.execute(address(timelock), 0, data, bytes32(0), salt);

        // Warp past delay
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(executor);
        timelock.execute(address(timelock), 0, data, bytes32(0), salt);

        assertTrue(timelock.isOperationDone(opId));
        assertEq(timelock.getMinDelay(), 48 hours);
    }

    function testCannotScheduleWithoutRole() public {
        bytes memory data = abi.encodeWithSelector(timelock.updateDelay.selector, 48 hours);

        vm.prank(address(0x99));
        vm.expectRevert();
        timelock.schedule(address(timelock), 0, data, bytes32(0), keccak256("x"), 24 hours);
    }

    function testCannotScheduleBelowMinDelay() public {
        bytes memory data = abi.encodeWithSelector(timelock.updateDelay.selector, 48 hours);

        vm.prank(proposer);
        vm.expectRevert();
        timelock.schedule(address(timelock), 0, data, bytes32(0), keccak256("x"), 1 hours);
    }
}
