// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract SplitEngine is AccessControl {
    bytes32 public constant CONFIGURATOR_ROLE = keccak256("CONFIGURATOR_ROLE");

    // Percentages (basis points: 10000 = 100%)
    uint256 public nodePoolShare = 5000; // 50%
    uint256 public opsPoolShare = 3000;  // 30%
    uint256 public treasuryShare = 2000; // 20%
    uint256 public infraReserveShare = 1000;  // 10% (taken from Node Pool)

    event RevenueSplit(uint256 total, uint256 nodePool, uint256 opsPool, uint256 treasury);
    event SharesUpdated(uint256 nodePoolShare, uint256 opsPoolShare, uint256 treasuryShare, uint256 infraReserveShare);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CONFIGURATOR_ROLE, msg.sender);
    }

    /**
     * @notice Allows an admin to update the revenue split parameters.
     * @param _nodePoolShare Share for the node pool (in basis points)
     * @param _opsPoolShare Share for the ops pool (in basis points)
     * @param _treasuryShare Share for the treasury (in basis points)
     * @param _infraReserveShare Share for the infra reserve taken from node pool (in basis points)
     */
    function updateShares(
        uint256 _nodePoolShare,
        uint256 _opsPoolShare,
        uint256 _treasuryShare,
        uint256 _infraReserveShare
    ) external onlyRole(CONFIGURATOR_ROLE) {
        require(_nodePoolShare + _opsPoolShare + _treasuryShare == 10000, "SplitEngine: total shares must equal 10000");
        require(_infraReserveShare <= 10000, "SplitEngine: infra reserve must not exceed 10000"); // Up to 100% of node pool

        nodePoolShare = _nodePoolShare;
        opsPoolShare = _opsPoolShare;
        treasuryShare = _treasuryShare;
        infraReserveShare = _infraReserveShare;

        emit SharesUpdated(_nodePoolShare, _opsPoolShare, _treasuryShare, _infraReserveShare);
    }

    // Calculation function for off-chain or on-chain verification
    function calculateSplit(uint256 amount) public view returns (uint256 nodePool, uint256 opsPool, uint256 treasury) {
        nodePool = (amount * nodePoolShare) / 10000;
        opsPool = (amount * opsPoolShare) / 10000;
        treasury = (amount * treasuryShare) / 10000;
    }

    // Function to calculate infra reserve from minimal node pool share
    function calculateInfraReserve(uint256 nodePoolAmount) public view returns (uint256 infraAmount, uint256 netNodeAmount) {
        infraAmount = (nodePoolAmount * infraReserveShare) / 10000;
        netNodeAmount = nodePoolAmount - infraAmount;
    }

    /**
     * @notice Computes the full revenue split across all pools including the infra reserve sub-split.
     * @param amount The total revenue amount to be split.
     * @return nodePool The base allocation for the Node Pool.
     * @return opsPool The allocation for the Operations Engine.
     * @return treasury The allocation for the Protocol Treasury.
     * @return infraReserve The infrastructure reserve taken from the Node Pool.
     * @return netNodeAmount The final net amount distributed to nodes after infra reserve.
     */
    function calculateFullSplit(uint256 amount) public view returns (
        uint256 nodePool,
        uint256 opsPool,
        uint256 treasury,
        uint256 infraReserve,
        uint256 netNodeAmount
    ) {
        (nodePool, opsPool, treasury) = calculateSplit(amount);
        (infraReserve, netNodeAmount) = calculateInfraReserve(nodePool);
    }
}
