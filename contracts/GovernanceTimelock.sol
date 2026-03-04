// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title GovernanceTimelock
 * @notice Timelocked upgrade controller for Satelink protocol.
 *         Wraps OpenZeppelin TimelockController with a 24-hour minimum delay.
 *         All critical admin operations (contract upgrades, role changes,
 *         threshold updates) must pass through this timelock.
 */
contract GovernanceTimelock is TimelockController {

    uint256 public constant MIN_DELAY = 24 hours;

    /**
     * @param proposers Addresses allowed to schedule operations
     * @param executors Addresses allowed to execute timelocked operations (address(0) = anyone)
     * @param admin     Admin address (can grant/revoke proposer/executor roles)
     */
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(MIN_DELAY, proposers, executors, admin) {}
}
