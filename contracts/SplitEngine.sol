// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SplitEngine
 * @notice Governance-controlled revenue split calculator for the Satelink 50/30/20 model.
 *         Percentages are stored as basis points (10000 = 100%) and can be updated by GOVERNOR_ROLE.
 *         Invariant: nodePoolBps + opsPoolBps + treasuryBps == 10000.
 */
contract SplitEngine is AccessControl {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    uint256 public nodePoolBps; // default 5000 = 50%
    uint256 public opsPoolBps; // default 3000 = 30%
    uint256 public treasuryBps; // default 2000 = 20%
    uint256 public infraReserveBps; // default 1000 = 10% (of node pool)

    uint256 public constant BPS_DENOMINATOR = 10000;

    // Safety bounds: no single pool can exceed 70% or drop below 5%
    uint256 public constant MIN_POOL_BPS = 500;
    uint256 public constant MAX_POOL_BPS = 7000;

    event SplitConfigUpdated(
        uint256 nodePoolBps, uint256 opsPoolBps, uint256 treasuryBps, uint256 infraReserveBps, address indexed updatedBy
    );
    event RevenueSplit(uint256 total, uint256 nodePool, uint256 opsPool, uint256 treasury);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);

        nodePoolBps = 5000;
        opsPoolBps = 3000;
        treasuryBps = 2000;
        infraReserveBps = 1000;
    }

    /**
     * @notice Update the revenue split configuration. All three pool values must sum to 10000.
     * @param _nodePoolBps  Node operator pool share in basis points
     * @param _opsPoolBps   Operations/platform pool share in basis points
     * @param _treasuryBps  Treasury share in basis points
     * @param _infraReserveBps  Infrastructure reserve (% of node pool) in basis points
     */
    function updateSplitConfig(
        uint256 _nodePoolBps,
        uint256 _opsPoolBps,
        uint256 _treasuryBps,
        uint256 _infraReserveBps
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_nodePoolBps + _opsPoolBps + _treasuryBps == BPS_DENOMINATOR, "SplitEngine: pools must sum to 10000");
        require(_nodePoolBps >= MIN_POOL_BPS && _nodePoolBps <= MAX_POOL_BPS, "SplitEngine: nodePool out of bounds");
        require(_opsPoolBps >= MIN_POOL_BPS && _opsPoolBps <= MAX_POOL_BPS, "SplitEngine: opsPool out of bounds");
        require(_treasuryBps >= MIN_POOL_BPS && _treasuryBps <= MAX_POOL_BPS, "SplitEngine: treasury out of bounds");
        require(_infraReserveBps <= 3000, "SplitEngine: infraReserve too high");

        nodePoolBps = _nodePoolBps;
        opsPoolBps = _opsPoolBps;
        treasuryBps = _treasuryBps;
        infraReserveBps = _infraReserveBps;

        emit SplitConfigUpdated(_nodePoolBps, _opsPoolBps, _treasuryBps, _infraReserveBps, msg.sender);
    }

    /**
     * @notice Calculate the 3-way revenue split for a given amount.
     */
    function calculateSplit(uint256 amount) public view returns (uint256 nodePool, uint256 opsPool, uint256 treasury) {
        nodePool = (amount * nodePoolBps) / BPS_DENOMINATOR;
        opsPool = (amount * opsPoolBps) / BPS_DENOMINATOR;
        treasury = amount - nodePool - opsPool; // remainder to treasury to avoid dust
    }

    /**
     * @notice Calculate infrastructure reserve deduction from the node pool share.
     */
    function calculateInfraReserve(uint256 nodePoolAmount)
        public
        view
        returns (uint256 infraAmount, uint256 netNodeAmount)
    {
        infraAmount = (nodePoolAmount * infraReserveBps) / BPS_DENOMINATOR;
        netNodeAmount = nodePoolAmount - infraAmount;
    }
}
