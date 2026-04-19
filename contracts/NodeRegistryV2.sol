// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract NodeRegistryV2 is AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Node {
        bytes32 id;
        address owner;
        string nodeType;
        string region;
        string metadata;
        bool active;
        uint256 registeredAt;
        uint256 lastHeartbeat;
    }

    mapping(bytes32 => Node) public nodes;
    uint256 public totalActive;

    event NodeRegistered(bytes32 indexed nodeId, address indexed owner, string nodeType);
    event NodeActivated(bytes32 indexed nodeId);
    event NodeDeactivated(bytes32 indexed nodeId);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerNode(
        bytes32 nodeId,
        address owner,
        string calldata nodeType,
        string calldata region,
        string calldata metadata
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        require(nodes[nodeId].id == bytes32(0), "Node already exists");

        nodes[nodeId] = Node({
            id: nodeId,
            owner: owner,
            nodeType: nodeType,
            region: region,
            metadata: metadata,
            active: false,
            registeredAt: block.timestamp,
            lastHeartbeat: block.timestamp
        });

        emit NodeRegistered(nodeId, owner, nodeType);
    }

    function setActive(bytes32 nodeId, bool active) external {
        require(nodes[nodeId].id != bytes32(0), "Node does not exist");
        require(
            nodes[nodeId].owner == msg.sender || hasRole(REGISTRAR_ROLE, msg.sender),
            "Not authorized"
        );

        if (active && !nodes[nodeId].active) {
            totalActive++;
            emit NodeActivated(nodeId);
        } else if (!active && nodes[nodeId].active) {
            totalActive--;
            emit NodeDeactivated(nodeId);
        }

        nodes[nodeId].active = active;
    }

    function heartbeat(bytes32 nodeId) external {
        require(nodes[nodeId].owner == msg.sender, "Not node owner");
        nodes[nodeId].lastHeartbeat = block.timestamp;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
