// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract EpochAnchor is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct Epoch {
        uint256 epochId;
        bytes32 merkleRoot;
        uint256 totalRevenue;
        uint256 timestamp;
    }

    mapping(uint256 => Epoch) public epochs;
    uint256 public latestEpochId;

    event EpochRootAnchored(uint256 indexed epochId, bytes32 merkleRoot, uint256 totalRevenue, uint256 timestamp);

    error EpochAlreadyAnchored(uint256 epochId);
    error InvalidEpochData();

    constructor(address _admin, address _oracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ORACLE_ROLE, _oracle);
    }

    function submitEpochRoot(uint256 epochId, bytes32 merkleRoot, uint256 totalRevenue) external onlyRole(ORACLE_ROLE) {
        if (epochs[epochId].timestamp != 0) revert EpochAlreadyAnchored(epochId);
        if (merkleRoot == bytes32(0)) revert InvalidEpochData();

        epochs[epochId] =
            Epoch({epochId: epochId, merkleRoot: merkleRoot, totalRevenue: totalRevenue, timestamp: block.timestamp});

        if (epochId > latestEpochId) {
            latestEpochId = epochId;
        }

        emit EpochRootAnchored(epochId, merkleRoot, totalRevenue, block.timestamp);
    }
}
