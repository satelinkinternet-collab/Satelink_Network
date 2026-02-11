// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SplitEngine {
    address public owner;
    
    // Percentages (basis points: 10000 = 100%)
    uint256 public constant NODE_POOL_SHARE = 5000; // 50%
    uint256 public constant OPS_POOL_SHARE = 3000;  // 30%
    uint256 public constant TREASURY_SHARE = 2000;  // 20%
    uint256 public constant INFRA_RESERVE = 1000;   // 10% (taken from Node Pool)

    event RevenueSplit(uint256 total, uint256 nodePool, uint256 opsPool, uint256 treasury);

    constructor() {
        owner = msg.sender;
    }

    // Pure calculation function for off-chain or on-chain verification
    function calculateSplit(uint256 amount) public pure returns (uint256 nodePool, uint256 opsPool, uint256 treasury) {
        nodePool = (amount * NODE_POOL_SHARE) / 10000;
        opsPool = (amount * OPS_POOL_SHARE) / 10000;
        treasury = (amount * TREASURY_SHARE) / 10000;
    }

    // Function to calculate infra reserve from minimal node pool share
    function calculateInfraReserve(uint256 nodePoolAmount) public pure returns (uint256 infraAmount, uint256 netNodeAmount) {
        infraAmount = (nodePoolAmount * INFRA_RESERVE) / 10000; // 10% of 50% = 5% of total
        netNodeAmount = nodePoolAmount - infraAmount;
    }
}
